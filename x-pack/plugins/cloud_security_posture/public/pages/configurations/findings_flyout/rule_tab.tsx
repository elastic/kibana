/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { RulesDetectionRuleCounter } from '../../rules/rules_detection_rule_counter';
import { BenchmarkIcons, CspFlyoutMarkdown, EMPTY_VALUE, RuleNameLink } from './findings_flyout';

export const getRuleList = (
  rule?: CspFinding['rule'],
  ruleState = 'unmuted',
  ruleFlyoutLink?: string
) => [
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.nameTitle', {
      defaultMessage: 'Name',
    }),
    description: rule?.name ? (
      <RuleNameLink ruleFlyoutLink={ruleFlyoutLink} ruleName={rule.name} />
    ) : (
      EMPTY_VALUE
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.descriptionTitle', {
      defaultMessage: 'Description',
    }),
    description: rule?.description ? (
      <CspFlyoutMarkdown>{rule.description}</CspFlyoutMarkdown>
    ) : (
      EMPTY_VALUE
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.AlertsTitle', {
      defaultMessage: 'Alerts',
    }),
    description:
      ruleState === 'unmuted' && rule?.benchmark?.name ? (
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
    description: rule?.tags?.length ? (
      <>
        {rule.tags.map((tag) => (
          <EuiBadge key={tag}>{tag}</EuiBadge>
        ))}
      </>
    ) : (
      EMPTY_VALUE
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.frameworkSourcesTitle', {
      defaultMessage: 'Framework Sources',
    }),
    description:
      rule?.benchmark?.id && rule?.benchmark?.name ? (
        <BenchmarkIcons benchmarkId={rule.benchmark.id} benchmarkName={rule.benchmark.name} />
      ) : (
        EMPTY_VALUE
      ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.cisSectionTitle', {
      defaultMessage: 'Framework Section',
    }),
    description: rule?.section || EMPTY_VALUE,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.profileApplicabilityTitle', {
      defaultMessage: 'Profile Applicability',
    }),
    description: rule?.profile_applicability ? (
      <CspFlyoutMarkdown>{rule.profile_applicability}</CspFlyoutMarkdown>
    ) : (
      EMPTY_VALUE
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.benchmarkTitle', {
      defaultMessage: 'Benchmark',
    }),
    description: rule?.benchmark?.name || EMPTY_VALUE,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.auditTitle', {
      defaultMessage: 'Audit',
    }),
    description: rule?.audit ? <CspFlyoutMarkdown>{rule.audit}</CspFlyoutMarkdown> : EMPTY_VALUE,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.referencesTitle', {
      defaultMessage: 'References',
    }),
    description: rule?.references ? (
      <CspFlyoutMarkdown>{rule.references}</CspFlyoutMarkdown>
    ) : (
      EMPTY_VALUE
    ),
  },
];

export const RuleTab = ({
  data,
  ruleFlyoutLink,
}: {
  data: CspFinding;
  ruleFlyoutLink?: string;
}) => {
  return <EuiDescriptionList listItems={getRuleList(data.rule, ruleFlyoutLink)} />;
};
