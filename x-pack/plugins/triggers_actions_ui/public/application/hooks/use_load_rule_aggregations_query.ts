/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { RuleExecutionStatusValues, RuleLastRunOutcomeValues } from '@kbn/alerting-plugin/common';
import { RulesListFilters } from '../../types';
import { loadRuleAggregationsWithKueryFilter } from '../lib/rule_api/aggregate_kuery_filter';
import { useKibana } from '../../common/lib/kibana';

const initializeAggregationResult = (values: readonly string[]) => {
  return values.reduce<Record<string, number>>(
    (prev: Record<string, number>, status: string) => ({
      ...prev,
      [status]: 0,
    }),
    {}
  );
};

interface UseLoadRuleAggregationsQueryProps {
  filters: RulesListFilters;
  enabled: boolean;
  refresh?: Date;
}

export const useLoadRuleAggregationsQuery = (props: UseLoadRuleAggregationsQueryProps) => {
  const { filters, enabled, refresh } = props;

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const internalLoadRuleAggregations = () => {
    return loadRuleAggregationsWithKueryFilter({
      http,
      searchText: filters.searchText,
      typesFilter: filters.types,
      actionTypesFilter: filters.actionTypes,
      ruleExecutionStatusesFilter: filters.ruleExecutionStatuses,
      ruleLastRunOutcomesFilter: filters.ruleLastRunOutcomes,
      ruleStatusesFilter: filters.ruleStatuses,
      tagsFilter: filters.tags,
    });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleStatusInfoMessage',
        {
          defaultMessage: 'Unable to load rule status info',
        }
      )
    );
  };

  const { data, refetch, isLoading, isFetching } = useQuery({
    queryKey: [
      'loadRuleAggregationsWithKueryFilter',
      filters.searchText,
      filters.types,
      filters.actionTypes,
      filters.ruleExecutionStatuses,
      filters.ruleLastRunOutcomes,
      filters.ruleStatuses,
      filters.tags,
      {
        refresh: refresh?.toISOString(),
      },
    ],
    queryFn: internalLoadRuleAggregations,
    onError: onErrorFn,
    enabled,
    keepPreviousData: true,
    cacheTime: 0,
  });

  const aggregation = data
    ? data
    : {
        ruleExecutionStatus: initializeAggregationResult(RuleExecutionStatusValues),
        ruleLastRunOutcome: initializeAggregationResult(RuleLastRunOutcomeValues),
      };

  return {
    loadRuleAggregations: refetch,
    rulesStatusesTotal: aggregation.ruleExecutionStatus ?? {},
    rulesLastRunOutcomesTotal: aggregation.ruleLastRunOutcome ?? {},
    isLoading: isLoading && isFetching,
  };
};
