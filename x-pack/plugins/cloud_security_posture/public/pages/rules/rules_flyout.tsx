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
  EuiTextColor,
  EuiTitle,
  EuiDescriptionList,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleSavedObject } from './use_csp_rules';
import * as TEXT from './translations';

interface RuleFlyoutProps {
  onClose(): void;
  toggleRule(rule: RuleSavedObject): void;
  rule: RuleSavedObject;
}

const tabs = ['overview', 'remediation', 'rego code'] as const;

type RuleTab = typeof tabs[number];

const getOverviewCard = (rule: RuleSavedObject): EuiDescriptionListProps['listItems'] => [
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.frameworkSourcesLabel', {
      defaultMessage: 'Framework Sources',
    }),
    description: '',
  },
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.sectionsLabel', {
      defaultMessage: 'Sections',
    }),
    description: '',
  },
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.profileApplicabilityLabel', {
      defaultMessage: 'Profile Applicability',
    }),
    description: '',
  },

  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.profileApplicabilityLabel', {
      defaultMessage: 'Profile Applicability',
    }),
    description: rule.attributes.description,
  },
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.auditLabel', {
      defaultMessage: 'Audit',
    }),
    description: '',
  },
  {
    title: i18n.translate('xpack.csp.rules.ruleFlyout.referencesLabel', {
      defaultMessage: 'References',
    }),
    description: '',
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
    <EuiFlyout ownFocus={false} onClose={onClose} outsideClickCloses>
      <EuiFlyoutHeader>
        <EuiTitle size="l">
          <EuiTextColor color="primary">
            <h2>{rule.attributes.name}</h2>
          </EuiTextColor>
        </EuiTitle>
        <EuiSpacer />
        <EuiTabs>
          {tabs.map((tabName) => (
            <EuiTab
              key={tabName}
              isSelected={tab === tabName}
              onClick={() => setTab(tabName)}
              style={{ textTransform: 'capitalize' }}
              disabled={tabName === 'rego code'}
            >
              {tabName}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {tab === 'overview' && <RuleOverviewTab rule={rule} toggleRule={() => toggleRule(rule)} />}
        {tab === 'remediation' && (
          <EuiDescriptionList
            compressed={false}
            type="column" // TODO: fix?
            listItems={getRemediationCard(rule)}
            style={{ flexDirection: 'column' }}
          />
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
          />
        </EuiToolTip>
      </span>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiDescriptionList
        compressed={false}
        type="column" // TODO: fix?
        listItems={getOverviewCard(rule)}
        style={{ flexDirection: 'column' }}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
