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
  EuiSwitch,
} from '@elastic/eui';
import { getRuleList } from '../findings/findings_flyout/rule_tab';
import { getRemediationList } from '../findings/findings_flyout/overview_tab';
import type { RuleSavedObject } from './use_csp_rules';
import * as TEXT from './translations';
import * as TEST_SUBJECTS from './test_subjects';

interface RuleFlyoutProps {
  onClose(): void;
  toggleRule(rule: RuleSavedObject): void;
  rule: RuleSavedObject;
}

const tabs = [
  { label: TEXT.OVERVIEW, id: 'overview', disabled: false },
  { label: TEXT.REMEDIATION, id: 'remediation', disabled: false },
] as const;

type RuleTab = typeof tabs[number]['id'];

export const RuleFlyout = ({ onClose, rule, toggleRule }: RuleFlyoutProps) => {
  const [tab, setTab] = useState<RuleTab>('overview');

  return (
    <EuiFlyout
      ownFocus={false}
      onClose={onClose}
      data-test-subj={TEST_SUBJECTS.CSP_RULES_FLYOUT_CONTAINER}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="l">
          <h2>{rule.attributes.name}</h2>
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
        {tab === 'overview' && <RuleOverviewTab rule={rule} toggleRule={() => toggleRule(rule)} />}
        {tab === 'remediation' && (
          <EuiDescriptionList compressed={false} listItems={getRemediationList(rule.attributes)} />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const RuleOverviewTab = ({ rule, toggleRule }: { rule: RuleSavedObject; toggleRule(): void }) => (
  <EuiFlexGroup direction="column">
    <EuiFlexItem>
      <span>
        <EuiSwitch
          label={TEXT.ACTIVATED}
          checked={rule.attributes.enabled}
          onChange={toggleRule}
          data-test-subj={TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule.id)}
        />
      </span>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiDescriptionList listItems={getRuleList(rule.attributes)} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
