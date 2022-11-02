/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup } from '@kbn/core/server';
import { parseDuration } from '@kbn/alerting-plugin/server';
import { addMessages, EsQueryRuleActionContext } from './action_context';
import { ComparatorFns, getHumanReadableComparator } from '../lib';
import { ExecutorOptions, OnlyEsQueryRuleParams, OnlySearchSourceRuleParams } from './types';
import { ActionGroupId, ConditionMetAlertInstanceId } from './constants';
import { fetchEsQuery } from './lib/fetch_es_query';
import { EsQueryRuleParams } from './rule_type_params';
import { fetchSearchSourceQuery } from './lib/fetch_search_source_query';
import { Comparator } from '../../../common/comparator_types';
import { isEsQueryRule } from './util';

export async function executor(core: CoreSetup, options: ExecutorOptions<EsQueryRuleParams>) {
  const esQueryRule = isEsQueryRule(options.params.searchType);
  const { alertId: ruleId, name, services, params, state, spaceId, logger } = options;
  const { alertFactory, scopedClusterClient, searchSourceClient } = services;
  const currentTimestamp = new Date().toISOString();
  const base = core.http.basePath.publicBaseUrl ?? '';
  const spacePrefix = spaceId !== 'default' ? `/s/${spaceId}` : '';

  const alertLimit = alertFactory.alertLimit.getValue();

  const compareFn = ComparatorFns.get(params.thresholdComparator);
  if (compareFn == null) {
    throw new Error(getInvalidComparatorError(params.thresholdComparator));
  }
  let latestTimestamp: string | undefined = tryToParseAsDate(state.latestTimestamp);

  // During each rule execution, we run the configured query, get a hit count
  // (hits.total) and retrieve up to params.size hits. We
  // evaluate the threshold condition using the value of hits.total. If the threshold
  // condition is met, the hits are counted toward the query match and we update
  // the rule state with the timestamp of the latest hit. In the next execution
  // of the rule, the latestTimestamp will be used to gate the query in order to
  // avoid counting a document multiple times.

  const { numMatches, searchResult, dateStart, dateEnd, link } = esQueryRule
    ? await fetchEsQuery(
        ruleId,
        name,
        params as OnlyEsQueryRuleParams,
        latestTimestamp,
        base,
        spacePrefix,
        {
          scopedClusterClient,
          logger,
        }
      )
    : await fetchSearchSourceQuery(
        ruleId,
        params as OnlySearchSourceRuleParams,
        latestTimestamp,
        base,
        spacePrefix,
        {
          searchSourceClient,
          logger,
        }
      );

  // apply the rule condition
  const conditionMet = compareFn(numMatches, params.threshold);

  const baseContext: Omit<EsQueryRuleActionContext, 'conditions'> = {
    title: name,
    date: currentTimestamp,
    value: numMatches,
    hits: searchResult.hits.hits,
    link,
  };

  if (conditionMet) {
    const baseActiveContext: EsQueryRuleActionContext = {
      ...baseContext,
      conditions: getContextConditionsDescription(params.thresholdComparator, params.threshold),
    } as EsQueryRuleActionContext;

    const actionContext = addMessages(options, baseActiveContext, params);
    const alertInstance = alertFactory.create(ConditionMetAlertInstanceId);
    alertInstance
      // store the params we would need to recreate the query that led to this alert instance
      .replaceState({ latestTimestamp, dateStart, dateEnd })
      .scheduleActions(ActionGroupId, actionContext);

    // update the timestamp based on the current search results
    const firstValidTimefieldSort = getValidTimefieldSort(
      searchResult.hits.hits.find((hit) => getValidTimefieldSort(hit.sort))?.sort
    );
    if (firstValidTimefieldSort) {
      latestTimestamp = firstValidTimefieldSort;
    }

    // we only create one alert if the condition is met, so we would only ever
    // reach the alert limit if the limit is less than 1
    alertFactory.alertLimit.setLimitReached(alertLimit < 1);
  } else {
    alertFactory.alertLimit.setLimitReached(false);
  }

  const { getRecoveredAlerts } = alertFactory.done();
  for (const alert of getRecoveredAlerts()) {
    const baseRecoveryContext: EsQueryRuleActionContext = {
      ...baseContext,
      conditions: getContextConditionsDescription(
        params.thresholdComparator,
        params.threshold,
        true
      ),
    } as EsQueryRuleActionContext;
    const recoveryContext = addMessages(options, baseRecoveryContext, params, true);
    alert.setContext(recoveryContext);
  }

  return { latestTimestamp };
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

export function getSearchParams(queryParams: OnlyEsQueryRuleParams) {
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

export function getInvalidComparatorError(comparator: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
}

export function getContextConditionsDescription(
  comparator: Comparator,
  threshold: number[],
  isRecovered: boolean = false
) {
  return i18n.translate('xpack.stackAlerts.esQuery.alertTypeContextConditionsDescription', {
    defaultMessage: 'Number of matching documents is {negation}{thresholdComparator} {threshold}',
    values: {
      thresholdComparator: getHumanReadableComparator(comparator),
      threshold: threshold.join(' and '),
      negation: isRecovered ? 'NOT ' : '',
    },
  });
}
