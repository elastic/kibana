/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { isElasticsearchVersionConflictError } from '@kbn/fleet-plugin/server/errors/utils';
import { APM_SOURCE_MAP_INDEX } from '../settings/apm_indices/get_apm_indices';
import { SourceMap } from './route';
import { getEncodedContent, getSourceMapId } from './sourcemap_utils';

export interface ApmSourceMapDoc {
  created: string;
  content: string;
  content_sha256: string;
  'file.path': string;
  'service.name': string;
  'service.version': string;
}

export async function createApmSourceMapDoc({
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
  const { contentEncoded, contentHash } = await getEncodedContent(
    sourceMapContent
  );
  const doc: ApmSourceMapDoc = {
    created,
    content: contentEncoded,
    content_sha256: contentHash,
    'file.path': bundleFilepath,
    'service.name': serviceName,
    'service.version': serviceVersion,
  };

  try {
    return await internalESClient.create<ApmSourceMapDoc>({
      index: APM_SOURCE_MAP_INDEX,
      id: getSourceMapId({ serviceName, serviceVersion, bundleFilepath }),
      body: doc,
    });
  } catch (e) {
    // we ignore 409 errors from the create (document already exists)
    if (!isElasticsearchVersionConflictError(e)) {
      throw e;
    }
  }
}
