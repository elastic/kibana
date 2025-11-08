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
  className,
}: {
  esClient: EsClient;
  serviceName: string;
  buildId: string;
  className: string;
}): Promise<SearchResponse<any, any>> {
  return esClient.search({
    index: `remote_cluster:androidmap-${serviceName}-${buildId}`,
    query: {
      ids: {
        values: [className],
      },
    },
    size: 1,
  });
}
