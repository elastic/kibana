/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Artifact } from '@kbn/fleet-plugin/server';
import { isElasticsearchVersionConflictError } from '@kbn/fleet-plugin/server/errors/utils';
import { deflate } from 'zlib';
import { BinaryLike, createHash } from 'crypto';
import { promisify } from 'util';
import { getUnzippedArtifactBody } from '../fleet/source_maps';
import { APM_SOURCE_MAP_INDEX } from '../settings/apm_indices/get_apm_indices';
import { SourceMap } from './route';

const deflateAsync = promisify(deflate);

function asSha256Encoded(content: BinaryLike): string {
  return createHash('sha256').update(content).digest('hex');
}

async function getEncodedContent(sourceMapContent: SourceMap) {
  const contentBuffer = Buffer.from(JSON.stringify(sourceMapContent));
  const contentZipped = await deflateAsync(contentBuffer);
  const contentEncoded = contentZipped.toString('base64');
  const contentHash = asSha256Encoded(contentZipped);
  return { contentEncoded, contentHash };
}

async function getSourceMapBody({
  created,
  sourceMapContent,
  bundleFilepath,
  serviceName,
  serviceVersion,
}: {
  created: string;
  sourceMapContent: SourceMap;
  bundleFilepath: string;
  serviceName: string;
  serviceVersion: string;
}) {
  const { contentEncoded, contentHash } = await getEncodedContent(
    sourceMapContent
  );
  return {
    created,
    content: contentEncoded,
    content_sha256: contentHash,
    'file.path': bundleFilepath,
    'service.name': serviceName,
    'service.version': serviceVersion,
  };
}

function getSourceMapId({
  serviceName,
  serviceVersion,
  bundleFilepath,
}: {
  serviceName: string;
  serviceVersion: string;
  bundleFilepath: string;
}) {
  return [serviceName, serviceVersion, bundleFilepath].join('-');
}

export async function createSourceMapDoc({
  internalESClient,
  created,
  sourceMapContent,
  bundleFilepath,
  serviceName,
  serviceVersion,
}: {
  internalESClient: ElasticsearchClient;
  created: string;
  sourceMapContent: SourceMap;
  bundleFilepath: string;
  serviceName: string;
  serviceVersion: string;
}) {
  const body = getSourceMapBody({
    created,
    sourceMapContent,
    bundleFilepath,
    serviceName,
    serviceVersion,
  });

  const params: estypes.CreateRequest = {
    index: APM_SOURCE_MAP_INDEX,
    id: getSourceMapId({ serviceName, serviceVersion, bundleFilepath }),
    body,
  };

  try {
    return await internalESClient.create(params);
  } catch (e) {
    // we ignore 409 errors from the create (document already exists)
    if (!isElasticsearchVersionConflictError(e)) {
      throw e;
    }
  }
}

export async function bulkCreateSourceMapDocs({
  artifacts,
  internalESClient,
}: {
  artifacts: Artifact[];
  internalESClient: ElasticsearchClient;
}) {
  const docs = await Promise.all(
    artifacts.map(async (artifact) => {
      const { serviceName, serviceVersion, bundleFilepath, sourceMap } =
        await getUnzippedArtifactBody(artifact.body);

      return await getSourceMapBody({
        created: artifact.created,
        sourceMapContent: sourceMap,
        bundleFilepath,
        serviceName,
        serviceVersion,
      });
    })
  );

  return internalESClient.bulk({
    body: docs.flatMap((doc) => {
      const id = getSourceMapId({
        serviceName: doc['service.name'],
        serviceVersion: doc['service.version'],
        bundleFilepath: doc['file.path'],
      });
      return [{ create: { _index: APM_SOURCE_MAP_INDEX, _id: id } }, doc];
    }),
  });
}

export async function getLatestSourceMapDoc(
  internalESClient: ElasticsearchClient
) {
  const params = {
    size: 1,
    _source: ['created'],
    sort: [{ created: { order: 'desc' } }],
    body: {
      query: { match_all: {} },
    },
  };
  const res = await internalESClient.search<{ created: string }>(params);
  return res.hits.hits[0]?._source?.created;
}
