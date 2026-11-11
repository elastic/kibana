/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/types';
import type { InferSearchResponseOf } from '@kbn/es-types';
import type { APMRouteHandlerResources } from '../../../../routes/apm_routes/register_apm_server_routes';

interface LogsClientSearchRequest {
  query: QueryDslQueryContainer;
  fields: string[];
  /**
   * Maximum number of hits to return. Defaults to 1000.
   * Use `size + 1` to detect truncation without requesting a count phase.
   */
  size?: number;
  /**
   * Sort order for returned hits. Defaults to unordered (index order).
   * Pass `[{ '@timestamp': { order: 'desc' } }]` to get the most recent N docs
   * when `size` is capped — otherwise truncation is arbitrary.
   */
  sort?: SortCombinations[];
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
      // ignore_unavailable: true prevents a 500 when getFlattenedLogSources resolves to
      // concrete index names and one of them has since been deleted/rolled over.
      ignore_unavailable: true,
      allow_no_indices: true,
      size: props.size ?? 1000,
      track_total_hits: false,
      query: props.query,
      fields: props.fields,
      ...(props.sort ? { sort: props.sort } : {}),
    });
    return response as InferSearchResponseOf<T>;
  }
  return {
    search,
  };
};
