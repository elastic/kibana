/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiDescriptionList, EuiLink, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { RulesDetectionRuleCounter } from '../../rules/rules_detection_rule_counter';
import { CisKubernetesIcons, CspFlyoutMarkdown } from './findings_flyout';

export const getRuleList = (
  rule: CspFinding['rule'],
  ruleState = 'unmuted',
  ruleFlyoutLink?: string
) => [
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.nameTitle', {
      defaultMessage: 'Name',
    }),
    description: ruleFlyoutLink ? (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.nameTooltip', {
          defaultMessage: 'Manage Rule',
        })}
      >
        <EuiLink href={ruleFlyoutLink}>{rule.name}</EuiLink>
      </EuiToolTip>
    ) : (
      rule.name
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.descriptionTitle', {
      defaultMessage: 'Description',
    }),
    description: <CspFlyoutMarkdown>{rule.description}</CspFlyoutMarkdown>,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.AlertsTitle', {
      defaultMessage: 'Alerts',
    }),
    description:
      ruleState === 'unmuted' ? (
        <RulesDetectionRuleCounter benchmarkRule={rule} />
      ) : (
        <FormattedMessage
          id="xpack.csp.findings.findingsFlyout.ruleTab.disabledRuleText"
          defaultMessage="Disabled"
        />
      ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.tagsTitle', {
      defaultMessage: 'Tags',
    }),
    description: (
      <>
        {rule.tags.map((tag) => (
          <EuiBadge key={tag}>{tag}</EuiBadge>
        ))}
      </>
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.frameworkSourcesTitle', {
      defaultMessage: 'Framework Sources',
    }),
    description: (
      <CisKubernetesIcons benchmarkId={rule.benchmark.id} benchmarkName={rule.benchmark.name} />
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.cisSectionTitle', {
      defaultMessage: 'CIS Section',
    }),
    description: rule.section,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.profileApplicabilityTitle', {
      defaultMessage: 'Profile Applicability',
    }),
    description: <CspFlyoutMarkdown>{rule.profile_applicability}</CspFlyoutMarkdown>,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.benchmarkTitle', {
      defaultMessage: 'Benchmark',
    }),
    description: rule.benchmark.name,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.auditTitle', {
      defaultMessage: 'Audit',
    }),
    description: <CspFlyoutMarkdown>{rule.audit}</CspFlyoutMarkdown>,
  },
  ...(rule.references
    ? [
        {
          title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.referencesTitle', {
            defaultMessage: 'References',
          }),
          description: <CspFlyoutMarkdown>{rule.references}</CspFlyoutMarkdown>,
        },
      ]
    : []),
];

export const RuleTab = ({ data, ruleFlyoutLink }: { data: CspFinding; ruleFlyoutLink: string }) => {
  return <EuiDescriptionList listItems={getRuleList(data.rule, ruleFlyoutLink)} />;
};
