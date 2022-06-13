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
  type EuiDescriptionListProps,
  EuiToolTip,
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
  { label: TEXT.REGO_CODE, id: 'rego', disabled: true },
] as const;

type RuleTab = typeof tabs[number]['id'];

const getOverviewCard = (rule: RuleSavedObject): EuiDescriptionListProps['listItems'] => [
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.frameworkSourcesLabel', {
      defaultMessage: 'Framework Sources',
    }),
    description: '-', // TODO: add value
  },
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.sectionsLabel', {
      defaultMessage: 'Sections',
    }),
    description: '-', // TODO: add value
  },
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.profileApplicabilityLabel', {
      defaultMessage: 'Profile Applicability',
    }),
    description: rule.attributes.description || '',
  },
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.auditLabel', {
      defaultMessage: 'Audit',
    }),
    description: '-', // TODO: add value
  },
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.referencesLabel', {
      defaultMessage: 'References',
    }),
    description: '-', // TODO: add value
  },
];

const getRemediationCard = (rule: RuleSavedObject): EuiDescriptionListProps['listItems'] => [
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.remediationLabel', {
      defaultMessage: 'Remediation',
    }),
    description: rule.attributes.remediation,
  },
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.impactLabel', {
      defaultMessage: 'Impact',
    }),
    description: rule.attributes.impact,
  },
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.defaultValueLabel', {
      defaultMessage: 'Default Value',
    }),
    description: rule.attributes.default_value,
  },
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.rationaleLabel', {
      defaultMessage: 'Rationale',
    }),
    description: rule.attributes.rationale,
  },
];

export const RuleFlyout = ({ onClose, rule, toggleRule }: RuleFlyoutProps) => {
  const [tab, setTab] = useState<RuleTab>('overview');

  return (
    <EuiFlyout
      ownFocus={false}
      onClose={onClose}
      outsideClickCloses
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
          <EuiDescriptionList compressed={false} listItems={getRemediationCard(rule)} />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const RuleOverviewTab = ({ rule, toggleRule }: { rule: RuleSavedObject; toggleRule(): void }) => (
  <EuiFlexGroup direction="column">
    <EuiFlexItem>
      <span>
        <EuiToolTip content={rule.attributes.enabled ? TEXT.DEACTIVATE : TEXT.ACTIVATE}>
          <EuiSwitch
            label={TEXT.ACTIVATED}
            checked={rule.attributes.enabled}
            onChange={toggleRule}
            data-test-subj={TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule.attributes.id)}
          />
        </EuiToolTip>
      </span>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiDescriptionList compressed={false} listItems={getOverviewCard(rule)} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
