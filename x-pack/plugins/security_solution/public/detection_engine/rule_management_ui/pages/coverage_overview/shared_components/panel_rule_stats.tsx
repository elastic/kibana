/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiNotificationBadge } from '@elastic/eui';
import { css, cx } from '@emotion/css';
import React from 'react';
import * as i18n from '../translations';

export interface CoverageOverviewPanelRuleStatsProps {
  disabledRules: number;
  enabledRules: number;
}

const metadataLabelClass = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const CoverageOverviewPanelRuleStats = ({
  disabledRules,
  enabledRules,
}: CoverageOverviewPanelRuleStatsProps) => {
  return (
    <EuiFlexGroup
      data-test-subj="coverageOverviewPanelRuleStats"
      direction="column"
      gutterSize="xs"
    >
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiText className={cx(metadataLabelClass)} size="xs">
            {i18n.DISABLED_RULES_METADATA_LABEL}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge data-test-subj="ruleStatsDisabledRulesCount" color="subdued">
            {disabledRules}
          </EuiNotificationBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiText className={cx(metadataLabelClass)} size="xs">
            {i18n.ENABLED_RULES_METADATA_LABEL}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge data-test-subj="ruleStatsEnabledRulesCount" color="subdued">
            {enabledRules}
          </EuiNotificationBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
