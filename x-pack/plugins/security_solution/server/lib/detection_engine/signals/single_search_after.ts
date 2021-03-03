/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../alerts/server';
import { Logger } from '../../../../../../../src/core/server';
import { SignalSearchResponse } from './types';
import { BuildRuleMessage } from './rule_messages';
import { buildEventsSearchQuery } from './build_events_query';
import { createErrorsFromShard, makeFloatString } from './utils';
import {
  SortOrderOrUndefined,
  TimestampOverrideOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';

interface SingleSearchAfterParams {
  aggregations?: unknown;
  searchAfterSortId: string | undefined;
  index: string[];
  from: string;
  to: string;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  pageSize: number;
  sortOrder?: SortOrderOrUndefined;
  filter: unknown;
  timestampOverride: TimestampOverrideOrUndefined;
  buildRuleMessage: BuildRuleMessage;
  excludeDocsWithTimestampOverride: boolean;
}

export const executeSearchAfter = async (
  query: Record<string, unknown>,
  buildRuleMessage: BuildRuleMessage,
  timestampOverride: TimestampOverrideOrUndefined,
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>,
  logger: Logger
) => {
  try {
    const result = await services.callCluster('search', query);
    return result;
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
    } else if (exc.statusCode === 400) {
      // added this code to handle https://github.com/elastic/kibana/issues/93333
      // risky to compute this in the catch but I'm not sure how else to handle this
      if ('toJSON' in exc) {
        const rootCause = JSON.parse(exc.response).error;
        if (rootCause != null) {
          let thing = rootCause.caused_by;
          let reason;
          while (thing != null) {
            reason = thing.reason;
            thing = thing.caused_by;
          }
          if (
            reason != null &&
            reason.includes(
              'The nested depth of the query exceeds the maximum nested depth for bool queries set in [indices.query.bool.max_nested_depth]'
            )
          ) {
            throw new Error(
              `${reason} Please update the indices.query.bool.max_nested_depth property in your Elasticsearch config file (default is 20)`
            );
          }
          throw exc;
        }
        throw exc;
      }
      throw exc;
    }
  }
};

// utilize search_after for paging results into bulk.
export const singleSearchAfter = async ({
  aggregations,
  searchAfterSortId,
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
  excludeDocsWithTimestampOverride,
}: SingleSearchAfterParams): Promise<{
  searchResult: SignalSearchResponse;
  searchDuration: string;
  searchErrors: string[];
}> => {
  const searchAfterQuery = buildEventsSearchQuery({
    aggregations,
    index,
    from,
    to,
    filter,
    size: pageSize,
    sortOrder,
    searchAfterSortId,
    timestampOverride,
    excludeDocsWithTimestampOverride,
  });

  const start = performance.now();
  const nextSearchAfterResult: SignalSearchResponse = await executeSearchAfter(
    searchAfterQuery,
    buildRuleMessage,
    timestampOverride,
    services,
    logger
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
};
