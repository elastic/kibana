/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { termQuery } from '@kbn/observability-plugin/server';
// import { SERVICE_NAME } from '../../../common/es_fields/apm';
import type { EsClient } from '@kbn/content-management-plugin/server/event_stream/es/types';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
export async function getAndroidCrashDeobfuscated({
  esClient,
  serviceName,
  buildId,
  stacktrace,
}: {
  esClient: EsClient;
  serviceName: string;
  buildId: string;
  stacktrace: string[];
}): Promise<Array<SearchResponse<any, any>>> {
  const queryPromises: Array<Promise<SearchResponse<any, any>>> = [];
  for (const line of stacktrace) {
    queryPromises.push(
      esClient.search({
        index: `android-sourcmap-${serviceName}-${buildId}`,
        query: {
          bool: {
            filter: [{ terms: { stackframe: line } }],
          },
        },
        size: 1,
      })
    );
  }
  return Promise.all(queryPromises);
}
