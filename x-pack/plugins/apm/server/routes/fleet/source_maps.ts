/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CoreSetup,
  CoreStart,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { promisify } from 'util';
import { unzip } from 'zlib';
import { Artifact } from '@kbn/fleet-plugin/server';
import { SourceMap } from '../source_maps/route';
import { APMPluginStartDependencies } from '../../types';
import { getApmPackgePolicies } from './get_apm_package_policies';
import { APM_SERVER, PackagePolicy } from './register_fleet_policy_callbacks';

export interface ApmArtifactBody {
  serviceName: string;
  serviceVersion: string;
  bundleFilepath: string;
  sourceMap: SourceMap;
}
export type ArtifactSourceMap = Omit<Artifact, 'body'> & {
  body: ApmArtifactBody;
};

export type FleetPluginStart = NonNullable<APMPluginStartDependencies['fleet']>;

const doUnzip = promisify(unzip);

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

export async function listArtifacts({
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

export function getPackagePolicyWithSourceMap({
  packagePolicy,
  artifacts,
}: {
  packagePolicy: PackagePolicy;
  artifacts: ArtifactSourceMap[];
}) {
  const [firstInput, ...restInputs] = packagePolicy.inputs;
  return {
    ...packagePolicy,
    inputs: [
      {
        ...firstInput,
        config: {
          ...firstInput.config,
          [APM_SERVER]: {
            value: {
              ...firstInput?.config?.[APM_SERVER].value,
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
      },
      ...restInputs,
    ],
  };
}

export async function updateSourceMapsOnFleetPolicies({
  core,
  fleetPluginStart,
  savedObjectsClient,
  elasticsearchClient,
}: {
  core: { setup: CoreSetup; start: () => Promise<CoreStart> };
  fleetPluginStart: FleetPluginStart;
  savedObjectsClient: SavedObjectsClientContract;
  elasticsearchClient: ElasticsearchClient;
}) {
  const artifacts = await listArtifacts({ fleetPluginStart });

  const apmFleetPolicies = await getApmPackgePolicies({
    core,
    fleetPluginStart,
  });

  return Promise.all(
    apmFleetPolicies.items.map(async (item) => {
      const {
        id,
        revision,
        updated_at: updatedAt,
        updated_by: updatedBy,
        ...packagePolicy
      } = item;

      const updatedPackagePolicy = getPackagePolicyWithSourceMap({
        packagePolicy,
        artifacts,
      });

      await fleetPluginStart.packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        id,
        updatedPackagePolicy
      );
    })
  );
}

export function getCleanedBundleFilePath(bundleFilePath: string) {
  try {
    const cleanedBundleFilepath = new URL(bundleFilePath);
    return cleanedBundleFilepath.href;
  } catch (e) {
    return bundleFilePath;
  }
}
