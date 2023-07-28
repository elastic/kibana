/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { EuiTitle, EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Rule } from '../../../detection_engine/rule_management/logic';
import { FormattedDate } from '../../../common/components/formatted_date';
import { RuleSwitch } from '../../../detections/components/rules/rule_switch';
import { useStartMlJobs } from '../../../detection_engine/rule_management/logic/use_start_ml_jobs';
import {
  RULE_PREVIEW_TITLE_TEST_ID,
  RULE_PREVIEW_RULE_CREATED_BY_TEST_ID,
  RULE_PREVIEW_RULE_UPDATED_BY_TEST_ID,
} from './test_ids';
import * as i18n from './translations';

interface RulePreviewTitleProps {
  /**
   * Rule object that represents relevant information about a rule
   */
  rule: Rule;
  /**
   * Tooltip text that explains why a user does not have permission to rule
   */
  tooltipText?: string;
  /**
   * Boolean that indivates whether the rule switch button is isabled
   */
  isButtonDisabled: boolean;
  /**
   * Boolean that indivates whether the rule switch shoud be enabled
   */
  isRuleEnabled: boolean;
}

/**
 * Title component that shows basic information of a rule. This is displayed above rule preview body in rule preview panel
 */
export const RulePreviewTitle: React.FC<RulePreviewTitleProps> = ({
  rule,
  tooltipText,
  isButtonDisabled,
  isRuleEnabled,
}) => {
  const { startMlJobs } = useStartMlJobs();
  const startMlJobsIfNeeded = useCallback(
    () => startMlJobs(rule?.machine_learning_job_id),
    [rule, startMlJobs]
  );

  const createdBy = useMemo(
    () => (
      <EuiText size="xs">
        <FormattedMessage
          id="xpack.securitySolution.flyout.documentDetails.ruleCreationDescription"
          defaultMessage="Created by: {by} on {date}"
          values={{
            by: rule?.created_by ?? i18n.UNKNOWN_TEXT,
            date: (
              <FormattedDate
                value={rule?.created_at ?? new Date().toISOString()}
                fieldName="createdAt"
              />
            ),
          }}
        />
      </EuiText>
    ),
    [rule]
  );

  const updatedBy = useMemo(
    () => (
      <EuiText size="xs">
        <FormattedMessage
          id="xpack.securitySolution.flyout.documentDetails.ruleUpdateDescription"
          defaultMessage="Updated by: {by} on {date}"
          values={{
            by: rule?.updated_by ?? i18n.UNKNOWN_TEXT,
            date: (
              <FormattedDate
                value={rule?.updated_at ?? new Date().toISOString()}
                fieldName="updatedAt"
              />
            ),
          }}
        />
      </EuiText>
    ),
    [rule]
  );

  const enableRule = useMemo(
    () => (
      <EuiToolTip position="top" content={tooltipText}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <RuleSwitch
              id={rule?.id ?? '-1'}
              isDisabled={isButtonDisabled}
              enabled={isRuleEnabled}
              startMlJobsIfNeeded={startMlJobsIfNeeded}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{i18n.ENABLE_RULE_TEXT}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    ),
    [rule, tooltipText, isButtonDisabled, isRuleEnabled, startMlJobsIfNeeded]
  );

  return (
    <div data-test-subj={RULE_PREVIEW_TITLE_TEST_ID}>
      <EuiTitle>
        <h6>{rule.name}</h6>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" direction="column">
        <EuiFlexItem data-test-subj={RULE_PREVIEW_RULE_CREATED_BY_TEST_ID}>{createdBy}</EuiFlexItem>
        <EuiFlexItem data-test-subj={RULE_PREVIEW_RULE_UPDATED_BY_TEST_ID}>{updatedBy}</EuiFlexItem>
        <EuiFlexItem>{enableRule}</EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

RulePreviewTitle.displayName = 'RulePreviewTitle';
