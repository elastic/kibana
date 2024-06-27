/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DocumentDetailsRuleOverviewPanelKey } from '../shared/constants/panel_keys';
import { RuleOverview } from './components/rule_overview';
import { RuleFooter } from './components/footer';

export interface RuleOverviewPanelProps extends FlyoutPanelProps {
  key: typeof DocumentDetailsRuleOverviewPanelKey;
  params: {
    ruleId: string;
  };
}

/**
 * Displays a rule overview panel
 */
export const RuleOverviewPanel: React.FC = memo(() => {
  return (
    <EuiFlexGroup
      justifyContent="spaceBetween"
      direction="column"
      gutterSize="none"
      style={{ height: '100%' }}
    >
      <EuiFlexItem style={{ marginTop: '-15px' }}>
        <RuleOverview />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RuleFooter />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

RuleOverviewPanel.displayName = 'RuleOverviewPanel';
