/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from 'src/core/server';
import { EsQueryAlertActionContext, addMessages } from '../action_context';
import { ComparatorFns, getHumanReadableComparator } from '../../lib';
import { parseDuration } from '../../../../../alerting/server';
import { buildSortedEventsQuery } from '../../../../common/build_sorted_events_query';
import { ExecutorOptions, OnlyEsQueryAlertParams } from '../types';
import { ActionGroupId, ConditionMetAlertInstanceId, ES_QUERY_ID } from '../constants';

export async function esQueryExecutor(
  logger: Logger,
  options: ExecutorOptions<OnlyEsQueryAlertParams>
) {
  const { alertId, name, services, params, state } = options;
  const { alertFactory, search } = services;
  const previousTimestamp = state.latestTimestamp;

  const abortableEsClient = search.asCurrentUser;
  const { parsedQuery, dateStart, dateEnd } = getSearchParams(params);

  const compareFn = ComparatorFns.get(params.thresholdComparator);
  if (compareFn == null) {
    throw new Error(getInvalidComparatorError(params.thresholdComparator));
  }

  // During each alert execution, we run the configured query, get a hit count
  // (hits.total) and retrieve up to params.size hits. We
  // evaluate the threshold condition using the value of hits.total. If the threshold
  // condition is met, the hits are counted toward the query match and we update
  // the alert state with the timestamp of the latest hit. In the next execution
  // of the alert, the latestTimestamp will be used to gate the query in order to
  // avoid counting a document multiple times.

  let timestamp: string | undefined = tryToParseAsDate(previousTimestamp);
  const filter = timestamp
    ? {
        bool: {
          filter: [
            parsedQuery.query,
            {
              bool: {
                must_not: [
                  {
                    bool: {
                      filter: [
                        {
                          range: {
                            [params.timeField]: {
                              lte: timestamp,
                              format: 'strict_date_optional_time',
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    : parsedQuery.query;

  const query = buildSortedEventsQuery({
    index: params.index,
    from: dateStart,
    to: dateEnd,
    filter,
    size: params.size,
    sortOrder: 'desc',
    searchAfterSortId: undefined,
    timeField: params.timeField,
    track_total_hits: true,
  });

  logger.debug(`alert ${ES_QUERY_ID}:${alertId} "${name}" query - ${JSON.stringify(query)}`);

  const { body: searchResult } = await abortableEsClient.search(query);

  logger.debug(
    `alert ${ES_QUERY_ID}:${alertId} "${name}" result - ${JSON.stringify(searchResult)}`
  );

  const numMatches = (searchResult.hits.total as estypes.SearchTotalHits).value;

  // apply the alert condition
  const conditionMet = compareFn(numMatches, params.threshold);

  if (conditionMet) {
    const humanFn = i18n.translate(
      'xpack.stackAlerts.esQuery.alertTypeContextConditionsDescription',
      {
        defaultMessage: `Number of matching documents is {thresholdComparator} {threshold}`,
        values: {
          thresholdComparator: getHumanReadableComparator(params.thresholdComparator),
          threshold: params.threshold.join(' and '),
        },
      }
    );

    const baseContext: EsQueryAlertActionContext = {
      date: new Date().toISOString(),
      value: numMatches,
      conditions: humanFn,
      hits: searchResult.hits.hits,
    };

    const actionContext = addMessages(options, baseContext, params);
    const alertInstance = alertFactory.create(ConditionMetAlertInstanceId);
    alertInstance
      // store the params we would need to recreate the query that led to this alert instance
      .replaceState({ latestTimestamp: timestamp, dateStart, dateEnd })
      .scheduleActions(ActionGroupId, actionContext);

    // update the timestamp based on the current search results
    const firstValidTimefieldSort = getValidTimefieldSort(
      searchResult.hits.hits.find((hit) => getValidTimefieldSort(hit.sort))?.sort
    );
    if (firstValidTimefieldSort) {
      timestamp = firstValidTimefieldSort;
    }
  }

  return {
    latestTimestamp: timestamp,
  };
}

function getInvalidComparatorError(comparator: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
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

function getSearchParams(queryParams: OnlyEsQueryAlertParams) {
  const date = Date.now();
  const { esQuery, timeWindowSize, timeWindowUnit } = queryParams;

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

function getValidTimefieldSort(sortValues: Array<string | number | null> = []): undefined | string {
  for (const sortValue of sortValues) {
    const sortDate = tryToParseAsDate(sortValue);
    if (sortDate) {
      return sortDate;
    }
  }
}

function tryToParseAsDate(sortValue?: string | number | null): undefined | string {
  const sortDate = typeof sortValue === 'string' ? Date.parse(sortValue) : sortValue;
  if (sortDate && !isNaN(sortDate)) {
    return new Date(sortDate).toISOString();
  }
}
