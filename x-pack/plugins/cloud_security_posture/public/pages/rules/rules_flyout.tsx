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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CspBenchmarkRuleMetadata } from '../../../common/types/latest';
import { getRuleList } from '../configurations/findings_flyout/rule_tab';
import { getRemediationList } from '../configurations/findings_flyout/overview_tab';
import * as TEST_SUBJECTS from './test_subjects';
import { useChangeCspRuleState } from './change_csp_rule_state';
import { CspBenchmarkRulesWithStates } from './rules_container';

interface RuleFlyoutProps {
  onClose(): void;
  rule: CspBenchmarkRulesWithStates;
  refetchRulesStates: () => void;
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

export const RuleFlyout = ({ onClose, rule, refetchRulesStates }: RuleFlyoutProps) => {
  const [tab, setTab] = useState<RuleTab>('overview');
  const postRequestChangeRulesStates = useChangeCspRuleState();
  const isRuleMuted = rule?.state === 'muted';

  const switchRuleStates = async () => {
    if (rule.metadata.benchmark.rule_number) {
      const rulesObjectRequest = {
        benchmark_id: rule.metadata.benchmark.id,
        benchmark_version: rule.metadata.benchmark.version,
        rule_number: rule.metadata.benchmark.rule_number,
        rule_id: rule.metadata.id,
      };
      const nextRuleStates = isRuleMuted ? 'unmute' : 'mute';
      await postRequestChangeRulesStates(nextRuleStates, [rulesObjectRequest]);
      await refetchRulesStates();
    }
  };
  return (
    <EuiFlyout
      ownFocus={false}
      onClose={onClose}
      data-test-subj={TEST_SUBJECTS.CSP_RULES_FLYOUT_CONTAINER}
      outsideClickCloses
    >
      <EuiFlyoutHeader>
        <EuiTitle size="l">
          <h2>{rule.metadata.name}</h2>
        </EuiTitle>
        <EuiSpacer />
        <EuiSwitch
          className="eui-textTruncate"
          checked={!isRuleMuted}
          onChange={switchRuleStates}
          data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE_ROW_ITEM_NAME}
          label={
            rule.state === 'muted' ? (
              <FormattedMessage
                id="xpack.csp.rules.ruleFlyout.ruleFlyoutDisabledText"
                defaultMessage="Disabled"
              />
            ) : (
              <FormattedMessage
                id="xpack.csp.rules.ruleFlyout.ruleFlyoutEnabledText"
                defaultMessage="Enabled"
              />
            )
          }
        />
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
        {tab === 'overview' && <RuleOverviewTab rule={rule.metadata} />}
        {tab === 'remediation' && (
          <EuiDescriptionList compressed={false} listItems={getRemediationList(rule.metadata)} />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const RuleOverviewTab = ({ rule }: { rule: CspBenchmarkRuleMetadata }) => (
  <EuiFlexGroup direction="column">
    <EuiFlexItem>
      <EuiDescriptionList listItems={getRuleList(rule)} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
