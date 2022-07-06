/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import React, { useEffect, useState } from 'react';
import { Rule } from '../../../../types';
import { useLoadRuleAlertsAggs } from '../../../hooks/use_load_rule_alerts_aggregations';
import { useLoadRuleTypes } from '../../../hooks/use_load_rule_types';

export interface RuleAlertsSummaryProps {
  rule: Rule;
  filteredSolutions: string[];
}
export const RuleAlertsSummary = ({ rule, filteredSolutions }: RuleAlertsSummaryProps) => {
  const [features, setFeatures] = useState<string>('');
  const { ruleTypes } = useLoadRuleTypes({
    filteredSolutions,
  });
  const { ruleAlertsAggs, isLoadingRuleAlertsAggs, errorRuleAlertsAggs } = useLoadRuleAlertsAggs({
    ruleId: rule.id,
    features,
  });

  useEffect(() => {
    const matchedRuleType = ruleTypes.find((type) => type.id === rule.ruleTypeId);
    if (rule.consumer === ALERTS_FEATURE_ID && matchedRuleType && matchedRuleType.producer) {
      setFeatures(matchedRuleType.producer);
    } else setFeatures(rule.consumer);
  }, [rule, ruleTypes]);

  if (isLoadingRuleAlertsAggs) return <EuiLoadingSpinner />;
  if (errorRuleAlertsAggs) return <EuiFlexItem>Error</EuiFlexItem>;
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup>
        <EuiFlexItem>Total: {ruleAlertsAggs.active + ruleAlertsAggs.recovered}</EuiFlexItem>
        <EuiFlexItem>Active: {ruleAlertsAggs.active}</EuiFlexItem>
        <EuiFlexItem>Recovered: {ruleAlertsAggs.recovered}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleAlertsSummary as default };
