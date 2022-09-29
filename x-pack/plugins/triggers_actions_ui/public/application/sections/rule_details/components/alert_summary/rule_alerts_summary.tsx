/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { useLoadRuleAlertsAggs } from '../../../../hooks/use_load_rule_alerts_aggregations';
import { useLoadRuleTypes } from '../../../../hooks/use_load_rule_types';
import { RuleAlertsSummaryProps } from '.';
import { AlertSummaryWidgetError, AlertsSummaryWidgetUI } from './components';

export const RuleAlertsSummary = ({ rule, filteredRuleTypes }: RuleAlertsSummaryProps) => {
  const [features, setFeatures] = useState<string>('');
  const { ruleTypes } = useLoadRuleTypes({
    filteredRuleTypes,
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
  if (errorRuleAlertsAggs) return <AlertSummaryWidgetError />;
  return (
    <AlertsSummaryWidgetUI
      active={active}
      recovered={recovered}
      timeRange={
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.last30days"
          defaultMessage="Last 30 days"
        />
      }
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleAlertsSummary as default };
