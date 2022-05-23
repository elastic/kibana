/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useState, useCallback, useMemo } from 'react';
import { RuleExecutionStatusValues } from '@kbn/alerting-plugin/common';
import { loadRuleAggregations, LoadRuleAggregationsProps } from '../lib/rule_api';
import { useKibana } from '../../common/lib/kibana';

type UseLoadRuleAggregationsProps = Omit<LoadRuleAggregationsProps, 'http'> & {
  onError: (message: string) => void;
};

export function useLoadRuleAggregations({
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleStatusesFilter,
  tagsFilter,
  onError,
}: UseLoadRuleAggregationsProps) {
  const { http } = useKibana().services;

  const [rulesStatusesTotal, setRulesStatusesTotal] = useState<Record<string, number>>(
    RuleExecutionStatusValues.reduce<Record<string, number>>(
      (prev: Record<string, number>, status: string) => ({
        ...prev,
        [status]: 0,
      }),
      {}
    )
  );

  const internalLoadRuleAggregations = useCallback(async () => {
    try {
      const rulesAggs = await loadRuleAggregations({
        http,
        searchText,
        typesFilter,
        actionTypesFilter,
        ruleExecutionStatusesFilter,
        ruleStatusesFilter,
        tagsFilter,
      });
      if (rulesAggs?.ruleExecutionStatus) {
        setRulesStatusesTotal(rulesAggs.ruleExecutionStatus);
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
    ruleStatusesFilter,
    tagsFilter,
    onError,
    setRulesStatusesTotal,
  ]);

  return useMemo(
    () => ({
      loadRuleAggregations: internalLoadRuleAggregations,
      rulesStatusesTotal,
      setRulesStatusesTotal,
    }),
    [internalLoadRuleAggregations, rulesStatusesTotal, setRulesStatusesTotal]
  );
}
