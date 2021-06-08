/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';
import { promisify } from 'util';
import { unzip } from 'zlib';
import { Artifact } from '../../../../fleet/server';
import { sourceMapRt } from '../../routes/source_maps';
import { APMPluginStartDependencies } from '../../types';

interface ApmArtifactBody {
  serviceName: string;
  serviceVersion: string;
  bundleFilepath: string;
  sourceMap: t.TypeOf<typeof sourceMapRt>;
}
type ArtifactSourceMap = Omit<Artifact, 'body'> & { body: ApmArtifactBody };

type FleetPluginStart = NonNullable<APMPluginStartDependencies['fleet']>;

const doUnzip = promisify(unzip);

const APM_SERVER = 'apm-server';

function decodeArtifacts(artifacts: Artifact[]): Promise<ArtifactSourceMap[]> {
  return Promise.all(
    artifacts.map(async (artifact) => {
      const body = await doUnzip(Buffer.from(artifact.body, 'base64'));
      return {
        ...artifact,
        body: JSON.parse(body.toString()) as ApmArtifactBody,
      };
    })
  );
}

function getApmArtifactClient(fleetPluginStart: FleetPluginStart) {
  return fleetPluginStart.createArtifactsClient('apm');
}

export async function getArtifacts({
  fleetPluginStart,
}: {
  fleetPluginStart: FleetPluginStart;
}) {
  const apmArtifactClient = getApmArtifactClient(fleetPluginStart);
  const artifacts = await apmArtifactClient.listArtifacts({
    kuery: 'type: sourcemap',
  });

  return decodeArtifacts(artifacts.items);
}

export async function createApmArtifact({
  apmArtifactBody,
  fleetPluginStart,
}: {
  apmArtifactBody: ApmArtifactBody;
  fleetPluginStart: FleetPluginStart;
}) {
  const apmArtifactClient = getApmArtifactClient(fleetPluginStart);
  const identifier = `${apmArtifactBody.serviceName}-${apmArtifactBody.serviceVersion}`;

  return apmArtifactClient.createArtifact({
    type: 'sourcemap',
    identifier,
    content: JSON.stringify(apmArtifactBody),
  });
}

export async function deleteApmArtifact({
  id,
  fleetPluginStart,
}: {
  id: string;
  fleetPluginStart: FleetPluginStart;
}) {
  const apmArtifactClient = getApmArtifactClient(fleetPluginStart);
  return apmArtifactClient.deleteArtifact(id);
}

export async function updateSourceMapsToFleetPolicies({
  fleetPluginStart,
  savedObjectsClient,
  elasticsearchClient,
}: {
  fleetPluginStart: FleetPluginStart;
  savedObjectsClient: SavedObjectsClientContract;
  elasticsearchClient: ElasticsearchClient;
}) {
  const artifacts = await getArtifacts({ fleetPluginStart });

  const apmPolicies = await fleetPluginStart.packagePolicyService.list(
    savedObjectsClient,
    { kuery: 'ingest-package-policies.package.name:apm' }
  );

  return Promise.all(
    apmPolicies.items.map(async (packagePolicy) => {
      const {
        id,
        revision,
        updated_at: updatedAt,
        updated_by: updatedBy,
        ...policyRest
      } = packagePolicy;

      const [firstInput, ...restInputs] = packagePolicy.inputs;
      const updatedPackagePolicy = {
        ...policyRest,
        inputs: [
          {
            ...firstInput,
            config: {
              ...firstInput.config,
              [APM_SERVER]: {
                ...firstInput?.config?.[APM_SERVER],
                rum: {
                  source_mapping: {
                    metadata: artifacts.map((artifact) => ({
                      'service.name': artifact.body.serviceName,
                      'service.version': artifact.body.serviceVersion,
                      'bundle.filepath': artifact.body.bundleFilepath,
                      'sourcemap.url': artifact.relative_url,
                    })),
                  },
                },
              },
            },
          },
          ...restInputs,
        ],
      };

      await fleetPluginStart.packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        id,
        // @ts-ignore
        updatedPackagePolicy
      );
    })
  );
}
