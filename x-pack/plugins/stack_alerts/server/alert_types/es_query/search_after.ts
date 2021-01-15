/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Logger, LegacyScopedClusterClient } from 'src/core/server';
import { SearchResponse } from 'elasticsearch';
import { EsQueryAlertParams } from './alert_type_params';
import { parseDuration } from '../../../../alerts/server';
import { singleSearchAfter } from './single_search_after';

export const DEFAULT_MAX_SEARCH_AFTER_RESULTS = 1000;
export const DEFAULT_SEARCH_AFTER_PAGE_SIZE = 100;
export const DEFAULT_SEARCH_AFTER_COUNT_PAGE_SIZE = 1;

export interface ExecuteEsQueryAlertParams extends EsQueryAlertParams {
  date: number;
}

export interface HandleSearchAfterResultsResponse {
  numResultsHandled: number;
  advanceSortId: boolean;
}

export interface SearchAfterParameters {
  logger: Logger;
  callCluster: LegacyScopedClusterClient['callAsCurrentUser'];
  previousSortId: string | undefined;
  query: ExecuteEsQueryAlertParams;
  buildLogMessage: (...messages: string[]) => string;
  handleSearchAfterResults: (
    searchResults: SearchResponse<unknown>
  ) => HandleSearchAfterResultsResponse;
}

export async function searchAfter(params: SearchAfterParameters): Promise<string | undefined> {
  const {
    logger,
    previousSortId,
    callCluster,
    query: queryParams,
    buildLogMessage,
    handleSearchAfterResults,
  } = params;
  const { index, timeField } = queryParams;
  const { parsedQuery, dateStart, dateEnd } = getSearchAfterParams(queryParams);

  logger.info(`previousSortId: ${previousSortId}`);
  // sortId tells us where to start our next consecutive search_after query
  let sortId: string | undefined = previousSortId;
  let hasSortId = true;

  let numSearchAfterResultsHandled = 0;

  do {
    try {
      const { searchResult } = await singleSearchAfter({
        searchAfterSortId: sortId,
        index,
        from: dateStart,
        to: dateEnd,
        callCluster,
        logger,
        filter: parsedQuery.query,
        pageSize: DEFAULT_SEARCH_AFTER_PAGE_SIZE,
        timeField,
        buildLogMessage,
      });

      // search results yielded zero hits so exit
      if (searchResult.hits.hits.length === 0) {
        logger.debug(
          buildLogMessage(`searchResult.hits.hits.length was 0, exiting search_after loop`)
        );
        break;
      }

      // set next sortId based on current set of results
      const lastSortId = searchResult.hits.hits[searchResult.hits.hits.length - 1]?.sort;
      if (lastSortId != null && lastSortId.length !== 0) {
        sortId = lastSortId[0];
        hasSortId = true;
      } else {
        hasSortId = false;
      }

      // post-process results
      const resultsHandledResponse = handleSearchAfterResults(searchResult);
      numSearchAfterResultsHandled += resultsHandledResponse.numResultsHandled;
    } catch (err) {
      logger.error(buildLogMessage(`[-] search_after and bulk threw an error ${err}`));
    }
  } while (hasSortId && numSearchAfterResultsHandled < DEFAULT_MAX_SEARCH_AFTER_RESULTS);

  return sortId;
}

export async function searchAfterCount(params: SearchAfterParameters): Promise<string | undefined> {
  const {
    logger,
    previousSortId,
    callCluster,
    query: queryParams,
    buildLogMessage,
    handleSearchAfterResults,
  } = params;
  const { index, timeField } = queryParams;
  const { parsedQuery, dateStart, dateEnd } = getSearchAfterParams(queryParams);

  logger.info(`previousSortId: ${previousSortId}`);
  // sortId tells us where to start our next consecutive search_after query
  let sortId: string | undefined = previousSortId;

  const filter = sortId
    ? {
        bool: {
          filter: [
            parsedQuery.query,
            {
              bool: {
                must_not: [{ bool: { filter: [{ range: { [timeField]: { lte: sortId } } }] } }],
              },
            },
          ],
        },
      }
    : parsedQuery.query;

  try {
    const { searchResult } = await singleSearchAfter({
      searchAfterSortId: undefined,
      index,
      from: dateStart,
      to: dateEnd,
      callCluster,
      logger,
      filter,
      pageSize: DEFAULT_SEARCH_AFTER_COUNT_PAGE_SIZE,
      sortOrder: 'desc',
      timeField,
      buildLogMessage,
    });

    // search results yielded zero hits so exit
    if (searchResult.hits.hits.length > 0) {
      // handle results
      const resultsHandledResponse = handleSearchAfterResults(searchResult);

      if (resultsHandledResponse.advanceSortId) {
        // set next sort id based on current set of results
        const lastSortId = searchResult.hits.hits[0]?.sort;
        if (lastSortId != null && lastSortId.length !== 0) {
          sortId = lastSortId[0];
        }
      }
    }
  } catch (exc: unknown) {
    logger.error(buildLogMessage(`[-] search_after and bulk threw an error ${exc}`));
  }

  return sortId;
}

function getSearchAfterParams(queryParams: ExecuteEsQueryAlertParams) {
  const { esQuery, timeWindowSize, timeWindowUnit, date } = queryParams;

  let parsedQuery;
  try {
    parsedQuery = JSON.parse(esQuery);
  } catch (err) {
    throw new Error(getInvalidQueryError(esQuery));
  }

  if (parsedQuery && !parsedQuery.query) {
    throw new Error(getInvalidQueryError(esQuery));
  }

  const window = `${timeWindowSize}${timeWindowUnit}`;
  let timeWindow: number;
  try {
    timeWindow = parseDuration(window);
  } catch (err) {
    throw new Error(getInvalidWindowSizeError(window));
  }

  const dateStart = new Date(date - timeWindow).toISOString();
  const dateEnd = new Date(date).toISOString();

  return { parsedQuery, dateStart, dateEnd };
}

function getInvalidWindowSizeError(windowValue: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidWindowSizeErrorMessage', {
    defaultMessage: 'invalid format for windowSize: "{windowValue}"',
    values: {
      windowValue,
    },
  });
}

function getInvalidQueryError(query: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidQueryErrorMessage', {
    defaultMessage: 'invalid query specified: "{query}" - query must be JSON',
    values: {
      query,
    },
  });
}
