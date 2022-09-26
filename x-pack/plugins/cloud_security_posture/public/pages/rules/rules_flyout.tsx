/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiSpacer,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiDescriptionList,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getRuleList } from '../findings/findings_flyout/rule_tab';
import { getRemediationList } from '../findings/findings_flyout/overview_tab';
import type { RuleSavedObject } from './use_csp_rules';
import * as TEST_SUBJECTS from './test_subjects';

interface RuleFlyoutProps {
  onClose(): void;
  rule: RuleSavedObject;
}

const tabs = [
  {
    label: i18n.translate('xpack.csp.rules.ruleFlyout.overviewTabLabel', {
      defaultMessage: 'Overview',
    }),
    id: 'overview',
    disabled: false,
  },
  {
    label: i18n.translate('xpack.csp.rules.ruleFlyout.remediationTabLabel', {
      defaultMessage: 'Remediation',
    }),
    id: 'remediation',
    disabled: false,
  },
] as const;

type RuleTab = typeof tabs[number]['id'];

export const RuleFlyout = ({ onClose, rule }: RuleFlyoutProps) => {
  const [tab, setTab] = useState<RuleTab>('overview');

  return (
    <EuiFlyout
      ownFocus={false}
      onClose={onClose}
      data-test-subj={TEST_SUBJECTS.CSP_RULES_FLYOUT_CONTAINER}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="l">
          <h2>{rule.attributes.metadata.name}</h2>
        </EuiTitle>
        <EuiSpacer />
        <EuiTabs>
          {tabs.map((item) => (
            <EuiTab
              key={item.id}
              isSelected={tab === item.id}
              onClick={() => setTab(item.id)}
              disabled={item.disabled}
            >
              {item.label}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {tab === 'overview' && <RuleOverviewTab rule={rule} />}
        {tab === 'remediation' && (
          <EuiDescriptionList
            compressed={false}
            listItems={getRemediationList(rule.attributes.metadata)}
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const RuleOverviewTab = ({ rule }: { rule: RuleSavedObject }) => (
  <EuiFlexGroup direction="column">
    <EuiFlexItem>
      <EuiDescriptionList listItems={getRuleList(rule.attributes.metadata)} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
