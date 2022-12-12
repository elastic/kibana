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
import { getApmPackagePolicies } from './get_apm_package_policies';
import { APM_SERVER, PackagePolicy } from './register_fleet_policy_callbacks';

const doUnzip = promisify(unzip);

interface ApmSourceMapArtifactBody {
  serviceName: string;
  serviceVersion: string;
  bundleFilepath: string;
  sourceMap: SourceMap;
}
export type ArtifactSourceMap = Omit<Artifact, 'body'> & {
  body: ApmSourceMapArtifactBody;
};

export type FleetPluginStart = NonNullable<APMPluginStartDependencies['fleet']>;

export async function getUnzippedArtifactBody(artifactBody: string) {
  const unzippedBody = await doUnzip(Buffer.from(artifactBody, 'base64'));
  return JSON.parse(unzippedBody.toString()) as ApmSourceMapArtifactBody;
}

export function getApmArtifactClient(fleetPluginStart: FleetPluginStart) {
  return fleetPluginStart.createArtifactsClient('apm');
}

export async function listSourceMapArtifacts({
  fleetPluginStart,
  perPage = 20,
  page = 1,
}: {
  fleetPluginStart: FleetPluginStart;
  perPage?: number;
  page?: number;
}) {
  const apmArtifactClient = getApmArtifactClient(fleetPluginStart);
  const artifactsResponse = await apmArtifactClient.listArtifacts({
    kuery: 'type: sourcemap',
    perPage,
    page,
    sortOrder: 'desc',
    sortField: 'created',
  });

  const artifacts = await Promise.all(
    artifactsResponse.items.map(async (item) => {
      const body = await getUnzippedArtifactBody(item.body);
      return { ...item, body };
    })
  );

  return { artifacts, total: artifactsResponse.total };
}

export async function createFleetSourceMapArtifact({
  apmArtifactBody,
  fleetPluginStart,
}: {
  apmArtifactBody: ApmSourceMapArtifactBody;
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

export async function deleteFleetSourcemapArtifact({
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
  internalESClient,
}: {
  core: { setup: CoreSetup; start: () => Promise<CoreStart> };
  fleetPluginStart: FleetPluginStart;
  savedObjectsClient: SavedObjectsClientContract;
  internalESClient: ElasticsearchClient;
}) {
  const { artifacts } = await listSourceMapArtifacts({ fleetPluginStart });
  const apmFleetPolicies = await getApmPackagePolicies({
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
        internalESClient,
        id,
        updatedPackagePolicy
      );
    })
  );
}

export function getCleanedBundleFilePath(bundleFilepath: string) {
  try {
    const cleanedBundleFilepath = new URL(bundleFilepath);
    return cleanedBundleFilepath.href;
  } catch (e) {
    return bundleFilepath;
  }
}
