/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/core/server';
import { APM_SOURCE_MAP_INDEX } from '../settings/apm_indices/apm_system_index_constants';
import { ApmSourceMap } from './create_apm_source_map_index_template';
import { SourceMap } from './route';
import { getEncodedContent, getSourceMapId } from './sourcemap_utils';

export async function createApmSourceMap({
  internalESClient,
  logger,
  fleetId,
  created,
  sourceMapContent,
  bundleFilepath,
  serviceName,
  serviceVersion,
}: {
  internalESClient: ElasticsearchClient;
  logger: Logger;
  fleetId: string;
  created: string;
  sourceMapContent: SourceMap;
  bundleFilepath: string;
  serviceName: string;
  serviceVersion: string;
}) {
  const { contentEncoded, contentHash } = await getEncodedContent(
    sourceMapContent
  );
  const doc: ApmSourceMap = {
    fleet_id: fleetId,
    created,
    content: contentEncoded,
    content_sha256: contentHash,
    file: { path: bundleFilepath },
    service: { name: serviceName, version: serviceVersion },
  };

  const id = getSourceMapId({ serviceName, serviceVersion, bundleFilepath });
  logger.debug(`Create APM source map: "${id}"`);
  return await internalESClient.index<ApmSourceMap>({
    index: APM_SOURCE_MAP_INDEX,
    id,
    body: doc,
  });
}
