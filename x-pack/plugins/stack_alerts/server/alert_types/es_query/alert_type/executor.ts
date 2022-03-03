/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sha256 } from 'js-sha256';
import { i18n } from '@kbn/i18n';
import { CoreSetup, Logger } from 'src/core/server';
import { addMessages, EsQueryAlertActionContext } from '../action_context';
import { ComparatorFns } from '../../lib';
import { parseDuration } from '../../../../../alerting/server';
import { ExecutorOptions, OnlyEsQueryAlertParams, OnlySearchSourceAlertParams } from '../types';
import { ActionGroupId, ConditionMetAlertInstanceId } from '../constants';
import { getContextConditionsDescription, getInvalidComparatorError } from './messages';
import { fetchEsQuery } from './lib/fetch_es_query';
import { EsQueryAlertParams } from '../alert_type_params';
import { fetchSearchSourceQuery } from './lib/fetch_search_source_query';

export async function executor(
  logger: Logger,
  core: CoreSetup,
  options: ExecutorOptions<EsQueryAlertParams>
) {
  const esQueryAlert = isEsQueryAlert(options);
  const { alertId, name, services, params, state } = options;
  const { alertFactory, search, searchSourceClient } = services;
  const currentTimestamp = new Date().toISOString();
  const previousTimestamp = state.latestTimestamp;
  const publicBaseUrl = core.http.basePath.publicBaseUrl ?? '';

  const compareFn = ComparatorFns.get(params.thresholdComparator);
  if (compareFn == null) {
    throw new Error(getInvalidComparatorError(params.thresholdComparator));
  }
  let timestamp: string | undefined = tryToParseAsDate(previousTimestamp);

  const { numMatches, searchResult, dateStart, dateEnd } = esQueryAlert
    ? await fetchEsQuery(alertId, params as OnlyEsQueryAlertParams, timestamp, { search, logger })
    : await fetchSearchSourceQuery(alertId, params as OnlySearchSourceAlertParams, timestamp, {
        searchSourceClient,
        logger,
      });

  // apply the alert condition
  const conditionMet = compareFn(numMatches, params.threshold);

  if (conditionMet) {
    const base = publicBaseUrl;
    const link = esQueryAlert
      ? `${base}/app/management/insightsAndAlerting/triggersActions/rule/${alertId}`
      : `${base}/app/discover#/viewAlert/${alertId}?from=${dateStart}&to=${dateEnd}&checksum=${getChecksum(
          params
        )}`;

    const conditions = getContextConditionsDescription(
      params.thresholdComparator,
      params.threshold
    );
    const baseContext: EsQueryAlertActionContext = {
      title: name,
      date: currentTimestamp,
      value: numMatches,
      conditions,
      hits: searchResult.hits.hits,
      link,
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

  return { latestTimestamp: timestamp };
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

export function getSearchParams(queryParams: OnlyEsQueryAlertParams) {
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

export function getValidTimefieldSort(
  sortValues: Array<string | number | null> = []
): undefined | string {
  for (const sortValue of sortValues) {
    const sortDate = tryToParseAsDate(sortValue);
    if (sortDate) {
      return sortDate;
    }
  }
}

export function tryToParseAsDate(sortValue?: string | number | null): undefined | string {
  const sortDate = typeof sortValue === 'string' ? Date.parse(sortValue) : sortValue;
  if (sortDate && !isNaN(sortDate)) {
    return new Date(sortDate).toISOString();
  }
}

export function isEsQueryAlert(options: ExecutorOptions<EsQueryAlertParams>) {
  return options.params.searchType !== 'searchSource';
}

export function getChecksum(params: EsQueryAlertParams) {
  return sha256.create().update(JSON.stringify(params));
}
