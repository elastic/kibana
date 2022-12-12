/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RuleExecutionStatusValues, RuleLastRunOutcomeValues } from '@kbn/alerting-plugin/common';
import { useQuery } from '@tanstack/react-query';
import type { LoadRuleAggregationsProps } from '../lib/rule_api';
import { loadRuleAggregationsWithKueryFilter } from '../lib/rule_api/aggregate_kuery_filter';
import { useKibana } from '../../common/lib/kibana';
import { useRuleTypes } from './use_rule_types';

const initializeAggregationResult = (values: readonly string[]) => {
  return values.reduce<Record<string, number>>(
    (prev: Record<string, number>, status: string) => ({
      ...prev,
      [status]: 0,
    }),
    {}
  );
};

type UseLoadRuleAggregationsProps = Omit<LoadRuleAggregationsProps, 'http'> & {
  onError: (message: string) => void;
  filteredRuleTypes: string[];
  authorizedToCreateAnyRules: boolean;
};

export function useLoadRuleAggregations({
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleLastRunOutcomesFilter,
  ruleStatusesFilter,
  tagsFilter,
  onError,
  filteredRuleTypes,
  authorizedToCreateAnyRules,
}: UseLoadRuleAggregationsProps) {
  const { http } = useKibana().services;

  const ruleTypesState = useRuleTypes({ onError, filteredRuleTypes });

  const initialData = () => ({
    ruleExecutionStatus: initializeAggregationResult(RuleExecutionStatusValues),
    ruleLastRunOutcome: initializeAggregationResult(RuleLastRunOutcomeValues),
  });

  const internalLoadRuleAggregations = () => {
    return loadRuleAggregationsWithKueryFilter({
      http,
      searchText,
      typesFilter,
      actionTypesFilter,
      ruleExecutionStatusesFilter,
      ruleLastRunOutcomesFilter,
      ruleStatusesFilter,
      tagsFilter,
    });
  };

  const onErrorFn = () => {
    onError(
      i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleStatusInfoMessage',
        {
          defaultMessage: 'Unable to load rule status info',
        }
      )
    );
  };

  const { data, refetch } = useQuery({
    queryKey: [
      'loadRuleAggregationsWithKueryFilter',
      typesFilter,
      searchText,
      actionTypesFilter,
      ruleExecutionStatusesFilter,
      ruleLastRunOutcomesFilter,
      ruleStatusesFilter,
      tagsFilter,
    ],
    enabled: authorizedToCreateAnyRules && ruleTypesState.isInitialized,
    queryFn: internalLoadRuleAggregations,
    initialData,
    onError: onErrorFn,
  });

  return {
    loadRuleAggregations: refetch,
    rulesStatusesTotal: data?.ruleExecutionStatus ?? {},
    rulesLastRunOutcomesTotal: data?.ruleLastRunOutcome ?? {},
  };
}
