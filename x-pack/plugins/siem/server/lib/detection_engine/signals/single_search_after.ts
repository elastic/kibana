/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { performance } from 'perf_hooks';
import { AlertServices } from '../../../../../alerting/server';
import { Logger } from '../../../../../../../src/core/server';
import { SignalSearchResponse } from './types';
import { buildEventsSearchQuery } from './build_events_query';
import { makeFloatString } from './utils';

interface SingleSearchAfterParams {
  searchAfterSortId: string | undefined;
  index: string[];
  from: string;
  to: string;
  services: AlertServices;
  logger: Logger;
  pageSize: number;
  filter: unknown;
}

// utilize search_after for paging results into bulk.
export const singleSearchAfter = async ({
  searchAfterSortId,
  index,
  from,
  to,
  services,
  filter,
  logger,
  pageSize,
}: SingleSearchAfterParams): Promise<{
  searchResult: SignalSearchResponse;
  searchDuration: string;
}> => {
  try {
    const searchAfterQuery = buildEventsSearchQuery({
      index,
      from,
      to,
      filter,
      size: pageSize,
      searchAfterSortId,
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
