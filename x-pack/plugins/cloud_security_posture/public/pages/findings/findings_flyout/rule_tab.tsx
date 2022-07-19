/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CspFinding } from '../types';
import { CisKubernetesIcons, Markdown } from './findings_flyout';

export const getRuleList = (rule: CspFinding['rule']) => [
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.nameTitle', {
      defaultMessage: 'Name',
    }),
    description: rule.name,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.descriptionTitle', {
      defaultMessage: 'Description',
    }),
    description: <Markdown>{rule.description}</Markdown>,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.frameworkSourcesTitle', {
      defaultMessage: 'Framework Sources',
    }),
    description: <CisKubernetesIcons />,
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
    description: <Markdown>{rule.profile_applicability}</Markdown>,
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
    description: <Markdown>{rule.audit}</Markdown>,
  },
  ...(rule.references
    ? [
        {
          title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTab.referencesTitle', {
            defaultMessage: 'References',
          }),
          description: <Markdown>{rule.references}</Markdown>,
        },
      ]
    : []),
];

export const RuleTab = ({ data }: { data: CspFinding }) => (
  <EuiDescriptionList listItems={getRuleList(data.rule)} />
);
