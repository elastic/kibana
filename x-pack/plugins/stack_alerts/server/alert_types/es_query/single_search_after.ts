/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { performance } from 'perf_hooks';
import { SearchResponse } from 'elasticsearch';
import { Logger, LegacyScopedClusterClient } from 'src/core/server';
import { buildSortedEventsQuery } from '../../../common/build_sorted_events_query';
import { shimHitsTotal } from '../../../../../../src/plugins/data/server';

interface SingleSearchAfterParams {
  aggregations?: unknown;
  searchAfterSortId: string | undefined;
  index: string[];
  from: string;
  to: string;
  callCluster: LegacyScopedClusterClient['callAsCurrentUser'];
  logger: Logger;
  pageSize: number;
  sortOrder?: 'asc' | 'desc' | undefined;
  filter: unknown;
  timeField: string;
  buildLogMessage: (...messages: string[]) => string;
}

// utilize search_after for paging results into bulk.
export const singleSearchAfter = async ({
  aggregations,
  searchAfterSortId,
  index,
  from,
  to,
  callCluster,
  filter,
  logger,
  pageSize,
  sortOrder,
  timeField,
  buildLogMessage,
}: SingleSearchAfterParams): Promise<{
  searchResult: SearchResponse<unknown>;
  searchDuration: string;
}> => {
  try {
    const searchAfterQuery = buildSortedEventsQuery({
      aggregations,
      index,
      from,
      to,
      filter,
      size: pageSize,
      sortOrder,
      searchAfterSortId,
      timeField,
    });
    logger.info(`searchAfterQuery: ${JSON.stringify(searchAfterQuery)}`);

    const start = performance.now();
    const nextSearchAfterResult: SearchResponse<unknown> = await callCluster(
      'search',
      searchAfterQuery
    );
    const end = performance.now();
    return {
      // Needed until https://github.com/elastic/kibana/issues/26356 is resolved
      searchResult: shimHitsTotal(nextSearchAfterResult),
      searchDuration: Number(end - start).toFixed(2),
    };
  } catch (exc) {
    logger.error(buildLogMessage(`[-] nextSearchAfter threw an error ${exc}`));
    throw exc;
  }
};
