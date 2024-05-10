/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deflate } from 'zlib';
import { promisify } from 'util';

import type { BinaryLike } from 'crypto';
import { createHash } from 'crypto';

import { isEmpty, sortBy } from 'lodash';

import type { ElasticsearchClient } from '@kbn/core/server';

import { createEsSearchIterable } from '../utils/create_es_search_iterable';

import type { ListResult } from '../../../common/types';
import { FLEET_SERVER_ARTIFACTS_INDEX } from '../../../common';

import { ArtifactsElasticsearchError } from '../../errors';

import { isElasticsearchVersionConflictError } from '../../errors/utils';

import { withPackageSpan } from '../epm/packages/utils';

import { appContextService } from '../app_context';

import { isElasticsearchItemNotFoundError } from './utils';
import type {
  Artifact,
  ArtifactElasticsearchProperties,
  ArtifactEncodedMetadata,
  ArtifactsClientCreateOptions,
  ListArtifactsProps,
  NewArtifact,
  FetchAllArtifactsOptions,
} from './types';
import {
  esSearchHitToArtifact,
  newArtifactToElasticsearchProperties,
  uniqueIdFromArtifact,
} from './mappings';

const deflateAsync = promisify(deflate);

export const getArtifact = async (
  esClient: ElasticsearchClient,
  id: string
): Promise<Artifact | undefined> => {
  try {
    const esData = await esClient.get<ArtifactElasticsearchProperties>({
      index: FLEET_SERVER_ARTIFACTS_INDEX,
      id,
    });

    // @ts-expect-error @elastic/elasticsearch _source is optional
    return esSearchHitToArtifact(esData);
  } catch (e) {
    if (isElasticsearchItemNotFoundError(e)) {
      return;
    }

    throw new ArtifactsElasticsearchError(e);
  }
};

export const createArtifact = async (
  esClient: ElasticsearchClient,
  artifact: NewArtifact
): Promise<Artifact> => {
  const id = uniqueIdFromArtifact(artifact);
  const newArtifactData = newArtifactToElasticsearchProperties(artifact);

  try {
    await esClient.create({
      index: FLEET_SERVER_ARTIFACTS_INDEX,
      id,
      body: newArtifactData,
      refresh: 'wait_for',
    });
  } catch (e) {
    // we ignore 409 errors from the create (document already exists)
    if (!isElasticsearchVersionConflictError(e)) {
      throw new ArtifactsElasticsearchError(e);
    }
  }

  return esSearchHitToArtifact({ _id: id, _source: newArtifactData });
};

// Max length in bytes for artifacts batch
export const BULK_CREATE_MAX_ARTIFACTS_BYTES = 4_000_000;

// Function to split artifacts in batches depending on the encoded_size value.
const generateArtifactBatches = (
  artifacts: NewArtifact[],
  maxArtifactsBatchSizeInBytes: number = BULK_CREATE_MAX_ARTIFACTS_BYTES
): Array<Array<ArtifactElasticsearchProperties | { create: { _id: string } }>> => {
  const batches: Array<Array<ArtifactElasticsearchProperties | { create: { _id: string } }>> = [];

  let artifactsBatchLengthInBytes = 0;
  const sortedArtifacts = sortBy(artifacts, 'encodedSize');

  sortedArtifacts.forEach((artifact) => {
    const esArtifact = newArtifactToElasticsearchProperties(artifact);
    const bulkOperation = {
      create: {
        _id: uniqueIdFromArtifact(artifact),
      },
    };

    // Before adding the next artifact to the current batch, check if it can be added depending on the batch size limit.
    // If there is no artifact yet added to the current batch, we add it anyway ignoring the batch limit as the batch size has to be > 0.
    if (artifact.encodedSize + artifactsBatchLengthInBytes >= maxArtifactsBatchSizeInBytes) {
      artifactsBatchLengthInBytes = artifact.encodedSize;
      batches.push([bulkOperation, esArtifact]);
    } else {
      // Case it's the first one
      if (isEmpty(batches)) {
        batches.push([]);
      }
      // Adds the next artifact to the current batch and increases the batch size count with the artifact size.
      artifactsBatchLengthInBytes += artifact.encodedSize;
      batches[batches.length - 1].push(bulkOperation, esArtifact);
    }
  });

  return batches;
};

export const bulkCreateArtifacts = async (
  esClient: ElasticsearchClient,
  artifacts: NewArtifact[],
  refresh = false
): Promise<{ artifacts?: Artifact[]; errors?: Error[] }> => {
  const batches = generateArtifactBatches(
    artifacts,
    appContextService.getConfig()?.createArtifactsBulkBatchSize
  );
  const logger = appContextService.getLogger();
  const nonConflictErrors = [];
  logger.debug(`Number of batches generated for fleet artifacts: ${batches.length}`);

  for (let batchN = 0; batchN < batches.length; batchN++) {
    logger.debug(
      `Creating artifacts for batch ${batchN + 1} with ${batches[batchN].length / 2} artifacts`
    );
    logger.debug(`Artifacts in current batch: ${JSON.stringify(batches[batchN])}`);
    // Generate a bulk create for the current batch of artifacts
    const res = await withPackageSpan(`Bulk create fleet artifacts batch [${batchN}]`, () =>
      esClient.bulk({
        index: FLEET_SERVER_ARTIFACTS_INDEX,
        body: batches[batchN],
        refresh,
      })
    );

    // Track errors of the bulk create action
    if (res.errors) {
      nonConflictErrors.push(
        ...res.items.reduce<Error[]>((acc, item) => {
          // 409's (conflict - record already exists) are ignored since the artifact already exists
          if (item.create && item.create.status !== 409) {
            acc.push(
              new Error(
                `Create of artifact id [${item.create._id}] returned: result [${
                  item.create.result
                }], status [${item.create.status}], reason [${JSON.stringify(
                  item.create?.error || ''
                )}]`
              )
            );
          }
          return acc;
        }, [])
      );
    }
  }

  // Use non sorted artifacts array to preserve the artifacts order in the response
  const nonSortedEsArtifactsResponse: Artifact[] = artifacts.map((artifact) => {
    return esSearchHitToArtifact({
      _id: uniqueIdFromArtifact(artifact),
      _source: newArtifactToElasticsearchProperties(artifact),
    });
  });

  return {
    artifacts: nonSortedEsArtifactsResponse,
    errors: nonConflictErrors.length ? nonConflictErrors : undefined,
  };
};

export const deleteArtifact = async (esClient: ElasticsearchClient, id: string): Promise<void> => {
  try {
    await esClient.delete({
      index: FLEET_SERVER_ARTIFACTS_INDEX,
      id,
      refresh: 'wait_for',
    });
  } catch (e) {
    throw new ArtifactsElasticsearchError(e);
  }
};

export const bulkDeleteArtifacts = async (
  esClient: ElasticsearchClient,
  ids: string[]
): Promise<Error[]> => {
  try {
    const body = ids.map((id) => ({
      delete: { _index: FLEET_SERVER_ARTIFACTS_INDEX, _id: id },
    }));

    const res = await withPackageSpan(`Bulk delete fleet artifacts`, () =>
      esClient.bulk({
        body,
        refresh: 'wait_for',
      })
    );
    let errors: Error[] = [];
    // Track errors of the bulk delete action
    if (res.errors) {
      errors = res.items.reduce<Error[]>((acc, item) => {
        if (item.delete?.error) {
          acc.push(new Error(item.delete.error.reason));
        }
        return acc;
      }, []);
    }
    return errors;
  } catch (e) {
    throw new ArtifactsElasticsearchError(e);
  }
};

export const listArtifacts = async (
  esClient: ElasticsearchClient,
  options: ListArtifactsProps = {}
): Promise<ListResult<Artifact>> => {
  const { perPage = 20, page = 1, kuery = '', sortField = 'created', sortOrder = 'asc' } = options;

  try {
    const searchResult = await esClient.search<ArtifactElasticsearchProperties>({
      index: FLEET_SERVER_ARTIFACTS_INDEX,
      q: kuery,
      from: (page - 1) * perPage,
      ignore_unavailable: true,
      size: perPage,
      track_total_hits: true,
      rest_total_hits_as_int: true,
      body: {
        sort: [{ [sortField]: { order: sortOrder } }],
      },
    });

    return {
      // @ts-expect-error @elastic/elasticsearch _source is optional
      items: searchResult.hits.hits.map((hit) => esSearchHitToArtifact(hit)),
      page,
      perPage,
      total: searchResult.hits.total as number,
    };
  } catch (e) {
    throw new ArtifactsElasticsearchError(e);
  }
};

export const generateArtifactContentHash = (content: BinaryLike): string => {
  return createHash('sha256').update(content).digest('hex');
};

export const encodeArtifactContent = async (
  content: ArtifactsClientCreateOptions['content']
): Promise<ArtifactEncodedMetadata> => {
  const decodedContentBuffer = Buffer.from(content);
  const encodedContentBuffer = await deflateAsync(decodedContentBuffer);

  const encodedArtifact: ArtifactEncodedMetadata = {
    compressionAlgorithm: 'zlib',
    decodedSha256: generateArtifactContentHash(decodedContentBuffer.toString()),
    decodedSize: decodedContentBuffer.byteLength,
    encodedSha256: generateArtifactContentHash(encodedContentBuffer),
    encodedSize: encodedContentBuffer.byteLength,
    body: encodedContentBuffer.toString('base64'),
  };

  return encodedArtifact;
};

/**
 * Returns an iterator that loops through all the artifacts stored in the index
 *
 * @param esClient
 * @param options
 *
 * @example
 *
 * async () => {
 *   for await (const value of fetchAllArtifactsIterator()) {
 *     // process page of data here
 *   }
 * }
 */
export const fetchAllArtifacts = (
  esClient: ElasticsearchClient,
  options: FetchAllArtifactsOptions = {}
): AsyncIterable<Artifact[]> => {
  const { kuery = '', perPage = 1000, sortField, sortOrder, includeArtifactBody = true } = options;

  return createEsSearchIterable<ArtifactElasticsearchProperties>({
    esClient,
    searchRequest: {
      index: FLEET_SERVER_ARTIFACTS_INDEX,
      rest_total_hits_as_int: true,
      track_total_hits: false,
      q: kuery,
      size: perPage,
      sort: [
        {
          // MUST have a sort field and sort order
          [sortField || 'created']: {
            order: sortOrder || 'asc',
          },
        },
      ],
      _source_excludes: includeArtifactBody ? undefined : 'body',
    },
    resultsMapper: (data): Artifact[] => {
      return data.hits.hits.map((hit) => {
        // @ts-expect-error @elastic/elasticsearch _source is optional
        const artifact = esSearchHitToArtifact(hit);

        // If not body attribute is included, still create the property in the object (since the
        // return type is `Artifact` and `body` is required), but throw an error is caller attempts
        // to still access it.
        if (!includeArtifactBody) {
          Object.defineProperty(artifact, 'body', {
            enumerable: false,
            get(): string {
              throw new Error(
                `'body' attribute not included due to request to 'fetchAllArtifacts()' having options 'includeArtifactBody' set to 'false'`
              );
            },
          });
        }

        return artifact;
      });
    },
  });
};
