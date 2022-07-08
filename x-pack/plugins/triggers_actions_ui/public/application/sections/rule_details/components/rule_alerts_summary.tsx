/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
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
  const {
    ruleAlertsAggs: { active, recovered },
    isLoadingRuleAlertsAggs,
    errorRuleAlertsAggs,
  } = useLoadRuleAlertsAggs({
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
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.alertsTitle"
                defaultMessage="Alerts"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiPanel hasShadow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexGroup direction="row">
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.allAlertsTitle"
                    defaultMessage="All alerts"
                  />
                </EuiText>
                <EuiText>
                  <h4>{active + recovered}</h4>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup direction="row">
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.activeTitle"
                    defaultMessage="Active"
                  />
                </EuiText>
                <EuiText color="#4A7194">
                  <h4>{active}</h4>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup direction="row">
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.recoveredTitle"
                    defaultMessage="Recovered"
                  />
                </EuiText>
                <EuiFlexItem>
                  <EuiText color="#C4407C">
                    <h4>{recovered}</h4>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiHorizontalRule margin="none" />
      </EuiFlexGroup>
    </EuiPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleAlertsSummary as default };
