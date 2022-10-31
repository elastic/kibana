/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useState, useCallback, useMemo } from 'react';
import { RuleExecutionStatusValues, RuleLastRunOutcomeValues } from '@kbn/alerting-plugin/common';
import type { LoadRuleAggregationsProps } from '../lib/rule_api';
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

type UseLoadRuleAggregationsProps = Omit<LoadRuleAggregationsProps, 'http'> & {
  onError: (message: string) => void;
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
}: UseLoadRuleAggregationsProps) {
  const { http } = useKibana().services;

  const [rulesStatusesTotal, setRulesStatusesTotal] = useState<Record<string, number>>(
    initializeAggregationResult(RuleExecutionStatusValues)
  );

  const [rulesLastRunOutcomesTotal, setRulesLastRunOutcomesTotal] = useState<
    Record<string, number>
  >(initializeAggregationResult(RuleLastRunOutcomeValues));

  const internalLoadRuleAggregations = useCallback(async () => {
    try {
      const rulesAggs = await loadRuleAggregationsWithKueryFilter({
        http,
        searchText,
        typesFilter,
        actionTypesFilter,
        ruleExecutionStatusesFilter,
        ruleLastRunOutcomesFilter,
        ruleStatusesFilter,
        tagsFilter,
      });
      if (rulesAggs?.ruleExecutionStatus) {
        setRulesStatusesTotal(rulesAggs.ruleExecutionStatus);
      }
      if (rulesAggs?.ruleLastRunOutcome) {
        setRulesLastRunOutcomesTotal(rulesAggs.ruleLastRunOutcome);
      }
    } catch (e) {
      onError(
        i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleStatusInfoMessage',
          {
            defaultMessage: 'Unable to load rule status info',
          }
        )
      );
    }
  }, [
    http,
    searchText,
    typesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleLastRunOutcomesFilter,
    ruleStatusesFilter,
    tagsFilter,
    onError,
    setRulesStatusesTotal,
    setRulesLastRunOutcomesTotal,
  ]);

  return useMemo(
    () => ({
      loadRuleAggregations: internalLoadRuleAggregations,
      rulesStatusesTotal,
      rulesLastRunOutcomesTotal,
      setRulesStatusesTotal,
      setRulesLastRunOutcomesTotal,
    }),
    [
      internalLoadRuleAggregations,
      rulesStatusesTotal,
      rulesLastRunOutcomesTotal,
      setRulesStatusesTotal,
      setRulesLastRunOutcomesTotal,
    ]
  );
}
