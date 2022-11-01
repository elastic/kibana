/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiHealth, EuiToolTip } from '@elastic/eui';
import { RuleExecutionStatusErrorReasons } from '@kbn/alerting-plugin/common';
import { RuleTableItem } from '../../../../types';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { getHealthColor as getOutcomeHealthColor } from './rule_last_run_outcome_filter';
import { getHealthColor as getExecutionStatusHealthColor } from './rule_execution_status_filter';
import { rulesLastRunOutcomeTranslationMapping, ALERT_STATUS_LICENSE_ERROR } from '../translations';

interface RulesListTableStatusCellProps {
  rule: RuleTableItem;
  onManageLicenseClick: (rule: RuleTableItem) => void;
}

export const RulesListTableStatusCell = (props: RulesListTableStatusCellProps) => {
  const { rule, onManageLicenseClick } = props;
  const { executionStatus, lastRun } = rule;

  const isRuleLastRunOutcomeEnabled = getIsExperimentalFeatureEnabled('ruleLastRunOutcome');

  const healthColor = useMemo(() => {
    if (isRuleLastRunOutcomeEnabled) {
      return lastRun && getOutcomeHealthColor(lastRun.outcome);
    }
    return getExecutionStatusHealthColor(executionStatus.status);
  }, [isRuleLastRunOutcomeEnabled, executionStatus, lastRun]);

  if (isRuleLastRunOutcomeEnabled && !lastRun) {
    return null;
  }

  const tooltipMessage = lastRun!.outcome === 'failed' ? `Error: ${lastRun?.outcomeMsg}` : null;
  const isLicenseError = lastRun!.warning === RuleExecutionStatusErrorReasons.License;
  const statusMessage = isLicenseError
    ? ALERT_STATUS_LICENSE_ERROR
    : rulesLastRunOutcomeTranslationMapping[lastRun!.outcome];

  const health = (
    <EuiHealth
      data-test-subj={`ruleStatus-${executionStatus.status}`}
      color={healthColor || 'default'}
    >
      {statusMessage}
    </EuiHealth>
  );

  const healthWithTooltip = tooltipMessage ? (
    <EuiToolTip data-test-subj="ruleStatus-error-tooltip" position="top" content={tooltipMessage}>
      {health}
    </EuiToolTip>
  ) : (
    health
  );

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem>{healthWithTooltip}</EuiFlexItem>
      {isLicenseError && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            data-test-subj="ruleStatus-error-license-fix"
            onClick={() => onManageLicenseClick(rule)}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.rulesList.fixLicenseLink"
              defaultMessage="Fix"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
