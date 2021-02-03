/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  try {
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
    const nextSearchAfterResult: SignalSearchResponse = await services.callCluster(
      'search',
      searchAfterQuery
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
    throw exc;
  }
};
