/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { performance } from 'perf_hooks';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { SignalSearchResponse, SignalSource } from './types';
import { buildEventsSearchQuery } from './build_events_query';
import { createErrorsFromShard, makeFloatString } from './utils';
import type { TimestampOverride } from '../../../../common/detection_engine/rule_schema';
import { withSecuritySpan } from '../../../utils/with_security_span';
import type { IRuleExecutionLogForExecutors } from '../rule_monitoring';

interface SingleSearchAfterParams {
  aggregations?: Record<string, estypes.AggregationsAggregationContainer>;
  searchAfterSortIds: estypes.SortResults | undefined;
  index: string[];
  from: string;
  to: string;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  pageSize: number;
  sortOrder?: estypes.SortOrder;
  filter: estypes.QueryDslQueryContainer;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverride | undefined;
  trackTotalHits?: boolean;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
}

// utilize search_after for paging results into bulk.
export const singleSearchAfter = async <
  TAggregations = Record<estypes.AggregateName, estypes.AggregationsAggregate>
>({
  aggregations,
  searchAfterSortIds,
  index,
  runtimeMappings,
  from,
  to,
  services,
  filter,
  ruleExecutionLogger,
  pageSize,
  sortOrder,
  primaryTimestamp,
  secondaryTimestamp,
  trackTotalHits,
}: SingleSearchAfterParams): Promise<{
  searchResult: SignalSearchResponse<TAggregations>;
  searchDuration: string;
  searchErrors: string[];
}> => {
  return withSecuritySpan('singleSearchAfter', async () => {
    try {
      const searchAfterQuery = buildEventsSearchQuery({
        aggregations,
        index,
        from,
        to,
        runtimeMappings,
        filter,
        size: pageSize,
        sortOrder,
        searchAfterSortIds,
        primaryTimestamp,
        secondaryTimestamp,
        trackTotalHits,
      });

      const start = performance.now();
      const { body: nextSearchAfterResult } =
        await services.scopedClusterClient.asCurrentUser.search<SignalSource, TAggregations>(
          searchAfterQuery as estypes.SearchRequest,
          { meta: true }
        );
      const end = performance.now();

      const searchErrors = createErrorsFromShard({
        errors: nextSearchAfterResult._shards.failures ?? [],
      });

      return {
        searchResult: nextSearchAfterResult,
        searchDuration: makeFloatString(end - start),
        searchErrors,
      };
    } catch (exc) {
      ruleExecutionLogger.error(`[-] nextSearchAfter threw an error ${exc}`);
      if (
        exc.message.includes(`No mapping found for [${primaryTimestamp}] in order to sort on`) ||
        (secondaryTimestamp &&
          exc.message.includes(`No mapping found for [${secondaryTimestamp}] in order to sort on`))
      ) {
        ruleExecutionLogger.error(`[-] failure reason: ${exc.message}`);

        const searchRes: SignalSearchResponse<TAggregations> = {
          took: 0,
          timed_out: false,
          _shards: {
            total: 1,
            successful: 1,
            failed: 0,
            skipped: 0,
          },
          hits: {
            total: 0,
            max_score: 0,
            hits: [],
          },
        };
        return {
          searchResult: searchRes,
          searchDuration: '-1.0',
          searchErrors: exc.message,
        };
      }

      throw exc;
    }
  });
};
