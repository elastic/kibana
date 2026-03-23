/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { InferSearchResponseOf } from '@kbn/es-types';
import type { APMRouteHandlerResources } from '../../../../routes/apm_routes/register_apm_server_routes';

interface LogsClientSearchRequest {
  query: QueryDslQueryContainer;
  fields: string[];
}

export interface LogsClient {
  search: <T = unknown>(props: LogsClientSearchRequest) => Promise<InferSearchResponseOf<T>>;
}

export const createLogsClient = async (
  resources: APMRouteHandlerResources
): Promise<LogsClient> => {
  const { context } = resources;
  const core = await context.core;
  const { savedObjects } = core;

  const logsDataAccess = await resources.plugins.logsDataAccess.start();
  const logSourcesService =
    await logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
      savedObjects.client
    );

  const [logsIndexPattern, esClient] = await Promise.all([
    logSourcesService.getFlattenedLogSources(),
    core.elasticsearch.client.asCurrentUser,
  ]);

  async function search<T = unknown>(
    props: LogsClientSearchRequest
  ): Promise<InferSearchResponseOf<T>> {
    const response = await esClient.search({
      index: logsIndexPattern,
      size: 1000,
      track_total_hits: false,
      query: props.query,
      fields: props.fields,
    });
    return response as InferSearchResponseOf<T>;
  }
  return {
    search,
  };
};
