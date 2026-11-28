/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmSourceMapArtifactBody, ListSourceMapArtifactsResponse } from '@kbn/apm-api-shared';
import type { CoreStart, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Artifact } from '@kbn/fleet-plugin/server';
import { promisify } from 'util';
import { constants, unzip } from 'zlib';
import type { APMPluginStartDependencies } from '../../types';
import { getApmPackagePolicies } from './get_apm_package_policies';
import { getPackagePolicyWithSourceMap } from './get_package_policy_decorators';

const doUnzip = promisify(unzip);

// Artifact bodies are written as JSON.stringify({ serviceName, serviceVersion, bundleFilepath, sourceMap }),
// so the metadata sits at the start of the body. Decompressing this many bytes is enough to read it.
const METADATA_PREFIX_COMPRESSED_BYTES = 16 * 1024;
const SOURCE_MAP_KEY = ',"sourceMap":';

export type ArtifactSourceMap = Omit<Artifact, 'body'> & {
  body: ApmSourceMapArtifactBody;
};

export type SourceMapArtifactMetadata = Omit<ApmSourceMapArtifactBody, 'sourceMap'>;

export type ArtifactSourceMapMetadata = Omit<Artifact, 'body'> & {
  body: SourceMapArtifactMetadata;
};

export type FleetPluginStart = NonNullable<APMPluginStartDependencies['fleet']>;

export async function getUnzippedArtifactBody(artifactBody: string) {
  const unzippedBody = await doUnzip(Buffer.from(artifactBody, 'base64'));
  return JSON.parse(unzippedBody.toString()) as ApmSourceMapArtifactBody;
}

const isSourceMapArtifactMetadata = (value: unknown): value is SourceMapArtifactMetadata =>
  typeof value === 'object' &&
  value !== null &&
  ['serviceName', 'serviceVersion', 'bundleFilepath'].every(
    (key) => typeof (value as Record<string, unknown>)[key] === 'string'
  );

const pickMetadata = ({
  serviceName,
  serviceVersion,
  bundleFilepath,
}: SourceMapArtifactMetadata): SourceMapArtifactMetadata => ({
  serviceName,
  serviceVersion,
  bundleFilepath,
});

async function readMetadataFromBodyPrefix(artifactBody: string): Promise<unknown> {
  const base64PrefixLength = 4 * Math.ceil(METADATA_PREFIX_COMPRESSED_BYTES / 3);
  const compressedPrefix = Buffer.from(artifactBody.slice(0, base64PrefixLength), 'base64');
  const prefix = (
    await doUnzip(compressedPrefix, { finishFlush: constants.Z_SYNC_FLUSH })
  ).toString();
  const sourceMapKeyIndex = prefix.indexOf(SOURCE_MAP_KEY);
  return sourceMapKeyIndex === -1
    ? undefined
    : JSON.parse(`${prefix.slice(0, sourceMapKeyIndex)}}`);
}

/**
 * Reads serviceName, serviceVersion and bundleFilepath without decompressing and parsing the whole
 * source map. Falls back to the full body when the metadata is not at the start of it.
 */
export async function getArtifactMetadata(
  artifactBody: string
): Promise<SourceMapArtifactMetadata> {
  const fromPrefix = await readMetadataFromBodyPrefix(artifactBody).catch(() => undefined);
  return isSourceMapArtifactMetadata(fromPrefix)
    ? pickMetadata(fromPrefix)
    : pickMetadata(await getUnzippedArtifactBody(artifactBody));
}

export function getApmArtifactClient(fleetPluginStart: FleetPluginStart) {
  return fleetPluginStart.createArtifactsClient('apm');
}

function listNewestSourceMapArtifacts({
  fleetPluginStart,
  perPage = 20,
  page = 1,
}: {
  fleetPluginStart: FleetPluginStart;
  perPage?: number;
  page?: number;
}) {
  return getApmArtifactClient(fleetPluginStart).listArtifacts({
    kuery: 'type: sourcemap',
    perPage,
    page,
    sortOrder: 'desc',
    sortField: 'created',
  });
}

/**
 * Lists the newest source map artifacts with only their metadata in `body`.
 * Use this when the source map content is not needed, e.g. to build the APM package policy.
 */
export async function listSourceMapArtifactsMetadata({
  fleetPluginStart,
}: {
  fleetPluginStart: FleetPluginStart;
}): Promise<ArtifactSourceMapMetadata[]> {
  const { items } = await listNewestSourceMapArtifacts({ fleetPluginStart });
  return Promise.all(
    items.map(async ({ body, ...item }) => ({ ...item, body: await getArtifactMetadata(body) }))
  );
}

export async function listSourceMapArtifacts({
  fleetPluginStart,
  perPage = 20,
  page = 1,
}: {
  fleetPluginStart: FleetPluginStart;
  perPage?: number;
  page?: number;
}): Promise<ListSourceMapArtifactsResponse> {
  const artifactsResponse = await listNewestSourceMapArtifacts({ fleetPluginStart, perPage, page });

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

export async function updateSourceMapsOnFleetPolicies({
  coreStart,
  fleetPluginStart,
  savedObjectsClient,
  internalESClient,
}: {
  coreStart: CoreStart;
  fleetPluginStart: FleetPluginStart;
  savedObjectsClient: SavedObjectsClientContract;
  internalESClient: ElasticsearchClient;
}) {
  const artifacts = await listSourceMapArtifactsMetadata({ fleetPluginStart });
  const apmFleetPolicies = await getApmPackagePolicies({
    coreStart,
    fleetPluginStart,
  });

  return Promise.all(
    apmFleetPolicies.items.map(async (item) => {
      const { id, revision, updated_at: updatedAt, updated_by: updatedBy, ...packagePolicy } = item;

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
