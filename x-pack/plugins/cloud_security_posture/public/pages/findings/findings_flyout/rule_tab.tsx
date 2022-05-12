/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel } from '@elastic/eui';
import React from 'react';
import cisLogoIcon from '../../../assets/icons/cis_logo.svg';
import k8sLogoIcon from '../../../assets/icons/k8s_logo.svg';
import * as TEXT from '../translations';
import { CspFinding } from '../types';
import { Markdown } from './findings_flyout';

const getRuleList = (data: CspFinding) => [
  {
    title: TEXT.NAME,
    description: data.rule.name,
  },
  {
    title: TEXT.DESCRIPTION,
    description: <Markdown>{data.rule.description}</Markdown>,
  },
  {
    title: TEXT.FRAMEWORK_SOURCES,
    description: (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type={cisLogoIcon} size="xxl" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type={k8sLogoIcon} size="xxl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    title: TEXT.CIS_SECTION,
    description: data.rule.section,
  },
  {
    title: TEXT.PROFILE_APPLICABILITY,
    description: <Markdown>{data.rule.profile_applicability}</Markdown>,
  },
  {
    title: TEXT.BENCHMARK,
    description: data.rule.benchmark.name,
  },

  {
    title: TEXT.AUDIT,
    description: <Markdown>{data.rule.audit}</Markdown>,
  },
  {
    title: TEXT.REFERENCES,
    description: <Markdown>{data.rule.references}</Markdown>,
  },
];

export const RuleTab = ({ data }: { data: CspFinding }) => (
  <EuiPanel hasShadow={false} hasBorder>
    <EuiDescriptionList
      listItems={getRuleList(data)}
      titleProps={{ style: { width: '35%' } }}
      descriptionProps={{ style: { width: '65%' } }}
    />
  </EuiPanel>
);
