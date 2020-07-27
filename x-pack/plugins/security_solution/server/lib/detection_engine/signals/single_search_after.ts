/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { performance } from 'perf_hooks';
import { AlertServices } from '../../../../../alerts/server';
import { Logger } from '../../../../../../../src/core/server';
import { SignalSearchResponse } from './types';
import { buildEventsSearchQuery } from './build_events_query';
import { makeFloatString } from './utils';
import { TimestampOverrideOrUndefined } from '../../../../common/detection_engine/schemas/common/schemas';

interface SingleSearchAfterParams {
  aggregations?: unknown;
  searchAfterSortId: string | undefined;
  index: string[];
  from: string;
  to: string;
  services: AlertServices;
  logger: Logger;
  pageSize: number;
  filter: unknown;
  timestampOverride: TimestampOverrideOrUndefined;
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
  timestampOverride,
}: SingleSearchAfterParams): Promise<{
  searchResult: SignalSearchResponse;
  searchDuration: string;
}> => {
  try {
    const searchAfterQuery = buildEventsSearchQuery({
      aggregations,
      index,
      from,
      to,
      filter,
      size: pageSize,
      searchAfterSortId,
      timestampOverride,
    });

    const start = performance.now();
    const nextSearchAfterResult: SignalSearchResponse = await services.callCluster(
      'search',
      searchAfterQuery
    );
    const end = performance.now();
    return { searchResult: nextSearchAfterResult, searchDuration: makeFloatString(end - start) };
  } catch (exc) {
    logger.error(`[-] nextSearchAfter threw an error ${exc}`);
    throw exc;
  }
};
