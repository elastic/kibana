/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiHealth,
  EuiToolTip,
  EuiStat,
} from '@elastic/eui';
import { RuleTableItem } from '../../../../types';
import {
  getRuleHealthColor,
  getIsLicenseError,
  getRuleStatusMessage,
} from '../../../../common/lib/rule_status_helpers';
import {
  ALERT_STATUS_LICENSE_ERROR,
  rulesLastRunOutcomeTranslationMapping,
  rulesStatusesTranslationsMapping,
} from '../translations';

export interface RulesListTableStatusCellProps {
  rule: RuleTableItem;
  onManageLicenseClick: (rule: RuleTableItem) => void;
}

export const RulesListTableStatusCell = (props: RulesListTableStatusCellProps) => {
  const { rule, onManageLicenseClick } = props;
  const { lastRun } = rule;

  const isLicenseError = getIsLicenseError(rule);
  const healthColor = getRuleHealthColor(rule);
  const statusMessage = getRuleStatusMessage({
    rule,
    licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
    lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
    executionStatusTranslations: rulesStatusesTranslationsMapping,
  });
  const tooltipMessage = lastRun?.outcome === 'failed' ? `Error: ${lastRun?.outcomeMsg}` : null;

  if (!statusMessage) {
    return (
      <EuiStat
        titleSize="xs"
        title="--"
        description=""
        isLoading={!lastRun?.outcome && !rule.nextRun}
      />
    );
  }

  const health = (
    <EuiHealth
      data-test-subj={`ruleStatus-${lastRun?.outcome || 'pending'}`}
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
