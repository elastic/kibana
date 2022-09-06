/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList } from '@elastic/eui';
import React from 'react';
import * as TEXT from '../translations';
import { CspFinding } from '../types';
import { CisKubernetesIcons, Markdown } from './findings_flyout';

export const getRuleList = (rule: CspFinding['rule']) => [
  {
    title: TEXT.NAME,
    description: rule.name,
  },
  {
    title: TEXT.DESCRIPTION,
    description: <Markdown>{rule.description}</Markdown>,
  },
  {
    title: TEXT.FRAMEWORK_SOURCES,
    description: <CisKubernetesIcons />,
  },
  {
    title: TEXT.CIS_SECTION,
    description: rule.section,
  },
  {
    title: TEXT.PROFILE_APPLICABILITY,
    description: <Markdown>{rule.profile_applicability}</Markdown>,
  },
  {
    title: TEXT.BENCHMARK,
    description: rule.benchmark.name,
  },

  {
    title: TEXT.AUDIT,
    description: <Markdown>{rule.audit}</Markdown>,
  },
  {
    title: TEXT.REFERENCES,
    description: <Markdown>{rule.references}</Markdown>,
  },
];

export const RuleTab = ({ data }: { data: CspFinding }) => (
  <EuiDescriptionList listItems={getRuleList(data.rule)} />
);
