/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import { performance } from 'perf_hooks';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../alerting/server';
import { Logger } from '../../../../../../../src/core/server';
import type { SignalSearchResponse, SignalSource } from './types';
import { BuildRuleMessage } from './rule_messages';
import { buildEventsSearchQuery } from './build_events_query';
import { createErrorsFromShard, makeFloatString } from './utils';
import {
  SortOrderOrUndefined,
  TimestampOverrideOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';

interface SingleSearchAfterParams {
  aggregations?: Record<string, estypes.AggregationsAggregationContainer>;
  searchAfterSortIds: estypes.SearchSortResults | undefined;
  index: string[];
  from: string;
  to: string;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  pageSize: number;
  sortOrder?: SortOrderOrUndefined;
  filter: estypes.QueryDslQueryContainer;
  timestampOverride: TimestampOverrideOrUndefined;
  buildRuleMessage: BuildRuleMessage;
}

// utilize search_after for paging results into bulk.
export const singleSearchAfter = async ({
  aggregations,
  searchAfterSortIds,
  index,
  from,
  to,
  services,
  filter,
  logger,
  pageSize,
  sortOrder,
  timestampOverride,
  buildRuleMessage,
}: SingleSearchAfterParams): Promise<{
  searchResult: SignalSearchResponse;
  searchDuration: string;
  searchErrors: string[];
}> => {
  try {
    const searchAfterQuery = buildEventsSearchQuery({
      aggregations,
      index,
      from,
      to,
      filter,
      size: pageSize,
      sortOrder,
      searchAfterSortIds,
      timestampOverride,
    });

    const start = performance.now();
    const {
      body: nextSearchAfterResult,
    } = await services.scopedClusterClient.asCurrentUser.search<SignalSource>(
      searchAfterQuery as estypes.SearchRequest
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
    logger.error(buildRuleMessage(`[-] nextSearchAfter threw an error ${exc}`));
    if (
      exc.message.includes('No mapping found for [@timestamp] in order to sort on') ||
      exc.message.includes(`No mapping found for [${timestampOverride}] in order to sort on`)
    ) {
      logger.error(buildRuleMessage(`[-] failure reason: ${exc.message}`));

      const searchRes: SignalSearchResponse = {
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
};
