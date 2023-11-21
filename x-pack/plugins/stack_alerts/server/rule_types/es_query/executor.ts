/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sha256 } from 'js-sha256';
import { i18n } from '@kbn/i18n';
import { CoreSetup } from '@kbn/core/server';
import { isGroupAggregation, UngroupedGroupId } from '@kbn/triggers-actions-ui-plugin/common';
import { ALERT_EVALUATION_VALUE, ALERT_REASON, ALERT_URL } from '@kbn/rule-data-utils';

import { ComparatorFns } from '../../../common';
import {
  addMessages,
  EsQueryRuleActionContext,
  getContextConditionsDescription,
} from './action_context';
import {
  ExecutorOptions,
  OnlyEsQueryRuleParams,
  OnlySearchSourceRuleParams,
  OnlyEsqlQueryRuleParams,
} from './types';
import { ActionGroupId, ConditionMetAlertInstanceId } from './constants';
import { fetchEsQuery } from './lib/fetch_es_query';
import { EsQueryRuleParams } from './rule_type_params';
import { fetchSearchSourceQuery } from './lib/fetch_search_source_query';
import { isEsqlQueryRule, isSearchSourceRule } from './util';
import { fetchEsqlQuery } from './lib/fetch_esql_query';
import { ALERT_EVALUATION_CONDITIONS, ALERT_TITLE } from '..';

export async function executor(core: CoreSetup, options: ExecutorOptions<EsQueryRuleParams>) {
  const searchSourceRule = isSearchSourceRule(options.params.searchType);
  const esqlQueryRule = isEsqlQueryRule(options.params.searchType);
  const {
    rule: { id: ruleId, name },
    services,
    params,
    state,
    spaceId,
    logger,
    getTimeRange,
  } = options;
  const { alertsClient, scopedClusterClient, searchSourceClient, share, dataViews } = services;
  const currentTimestamp = new Date().toISOString();
  const publicBaseUrl = core.http.basePath.publicBaseUrl ?? '';
  const spacePrefix = spaceId !== 'default' ? `/s/${spaceId}` : '';
  const alertLimit = alertsClient?.getAlertLimitValue();
  const compareFn = ComparatorFns.get(params.thresholdComparator);
  if (compareFn == null) {
    throw new Error(getInvalidComparatorError(params.thresholdComparator));
  }
  const isGroupAgg = isGroupAggregation(params.termField);
  // For ungrouped queries, we run the configured query during each rule run, get a hit count
  // and retrieve up to params.size hits. We evaluate the threshold condition using the
  // value of the hit count. If the threshold condition is met, the hits are counted
  // toward the query match and we update the rule state with the timestamp of the latest hit.
  // In the next run of the rule, the latestTimestamp will be used to gate the query in order to
  // avoid counting a document multiple times.
  // latestTimestamp will be ignored if set for grouped queries
  let latestTimestamp: string | undefined = tryToParseAsDate(state.latestTimestamp);
  const { dateStart, dateEnd } = getTimeRange(`${params.timeWindowSize}${params.timeWindowUnit}`);

  const { parsedResults, link, index } = searchSourceRule
    ? await fetchSearchSourceQuery({
        ruleId,
        alertLimit,
        params: params as OnlySearchSourceRuleParams,
        latestTimestamp,
        spacePrefix,
        services: {
          share,
          searchSourceClient,
          logger,
          dataViews,
        },
        dateStart,
        dateEnd,
      })
    : esqlQueryRule
    ? await fetchEsqlQuery({
        ruleId,
        alertLimit,
        params: params as OnlyEsqlQueryRuleParams,
        spacePrefix,
        publicBaseUrl,
        services: {
          share,
          scopedClusterClient,
          logger,
        },
        dateStart,
        dateEnd,
      })
    : await fetchEsQuery({
        ruleId,
        name,
        alertLimit,
        params: params as OnlyEsQueryRuleParams,
        timestamp: latestTimestamp,
        publicBaseUrl,
        spacePrefix,
        services: {
          scopedClusterClient,
          logger,
        },
        dateStart,
        dateEnd,
      });
  const unmetGroupValues: Record<string, number> = {};
  for (const result of parsedResults.results) {
    const alertId = result.group;
    const value = result.value ?? result.count;

    // group aggregations use the bucket selector agg to compare conditions
    // within the ES query, so only 'met' results are returned, therefore we don't need
    // to use the compareFn
    const met = isGroupAgg ? true : compareFn(value, params.threshold);
    if (!met) {
      unmetGroupValues[alertId] = value;
      continue;
    }
    const baseContext: Omit<EsQueryRuleActionContext, 'conditions'> = {
      title: name,
      date: currentTimestamp,
      value,
      hits: result.hits,
      link,
    };
    const baseActiveContext: EsQueryRuleActionContext = {
      ...baseContext,
      conditions: getContextConditionsDescription({
        searchType: params.searchType,
        comparator: params.thresholdComparator,
        threshold: params.threshold,
        aggType: params.aggType,
        aggField: params.aggField,
        ...(isGroupAgg ? { group: alertId } : {}),
      }),
    } as EsQueryRuleActionContext;

    const actionContext = addMessages({
      ruleName: name,
      baseContext: baseActiveContext,
      params,
      ...(isGroupAgg ? { group: alertId } : {}),
      index,
    });

    const id = alertId === UngroupedGroupId && !isGroupAgg ? ConditionMetAlertInstanceId : alertId;

    alertsClient!.report({
      id,
      actionGroup: ActionGroupId,
      state: { latestTimestamp, dateStart, dateEnd },
      context: actionContext,
      payload: {
        [ALERT_URL]: actionContext.link,
        [ALERT_REASON]: actionContext.message,
        [ALERT_TITLE]: actionContext.title,
        [ALERT_EVALUATION_CONDITIONS]: actionContext.conditions,
        [ALERT_EVALUATION_VALUE]: `${actionContext.value}`,
      },
    });
    if (!isGroupAgg) {
      // update the timestamp based on the current search results
      const firstValidTimefieldSort = getValidTimefieldSort(
        result.hits.find((hit) => getValidTimefieldSort(hit.sort))?.sort
      );
      if (firstValidTimefieldSort) {
        latestTimestamp = firstValidTimefieldSort;
      }
    }
  }
  alertsClient!.setAlertLimitReached(parsedResults.truncated);

  const { getRecoveredAlerts } = alertsClient!;
  for (const recoveredAlert of getRecoveredAlerts()) {
    const alertId = recoveredAlert.alert.getId();
    const baseRecoveryContext: EsQueryRuleActionContext = {
      title: name,
      date: currentTimestamp,
      value: unmetGroupValues[alertId] ?? 0,
      hits: [],
      link,
      conditions: getContextConditionsDescription({
        searchType: params.searchType,
        comparator: params.thresholdComparator,
        threshold: params.threshold,
        isRecovered: true,
        aggType: params.aggType,
        aggField: params.aggField,
        ...(isGroupAgg ? { group: alertId } : {}),
      }),
    } as EsQueryRuleActionContext;
    const recoveryContext = addMessages({
      ruleName: name,
      baseContext: baseRecoveryContext,
      params,
      isRecovered: true,
      ...(isGroupAgg ? { group: alertId } : {}),
      index,
    });
    alertsClient?.setAlertData({
      id: alertId,
      context: recoveryContext,
      payload: {
        [ALERT_URL]: recoveryContext.link,
        [ALERT_REASON]: recoveryContext.message,
        [ALERT_TITLE]: recoveryContext.title,
        [ALERT_EVALUATION_CONDITIONS]: recoveryContext.conditions,
        [ALERT_EVALUATION_VALUE]: `${recoveryContext.value}`,
      },
    });
  }
  return { state: { latestTimestamp } };
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

export function getChecksum(params: OnlyEsQueryRuleParams) {
  return sha256.create().update(JSON.stringify(params));
}

export function getInvalidComparatorError(comparator: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
}
