/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregate,
  SearchResponse,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { type Client } from '@elastic/elasticsearch';
import type { TryWithRetriesOptions } from '@kbn/ftr-common-functional-services';
import { FtrProviderContext } from '../ftr_provider_context';

const RETRY_COUNT = 10;
const RETRY_DELAY = 1000;

export function AlertingApiProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const logger = getService('log');

  return {
    async waitForDocumentInIndex<T>({
      esClient,
      indexName,
      docCountTarget,
      filters,
      retryOptions = { retryCount: RETRY_COUNT, retryDelay: RETRY_DELAY },
    }: {
      esClient: Client;
      indexName: string;
      docCountTarget: number;
      filters?: QueryDslQueryContainer[];
      retryOptions?: TryWithRetriesOptions;
    }): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
      return await retry.tryWithRetries(
        `Alerting API - waitForDocumentInIndex, retryOptions: ${JSON.stringify(retryOptions)}`,
        async () => {
          const response = await esClient.search<T>({
            index: indexName,
            rest_total_hits_as_int: true,
            ignore_unavailable: true,
            ...(filters
              ? {
                  query: {
                    bool: {
                      filter: filters,
                    },
                  },
                }
              : undefined),
          });
          if (!response.hits.total || (response.hits.total as number) < docCountTarget) {
            logger.debug(`Document count is ${response.hits.total}, should be ${docCountTarget}`);
            throw new Error(
              `Number of hits does not match expectation (total: ${response.hits.total}, target: ${docCountTarget})`
            );
          }
          logger.debug(`Returned document: ${JSON.stringify(response.hits.hits[0])}`);
          return response;
        },
        retryOptions
      );
    },
  };
}
