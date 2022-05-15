/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiCodeBlock,
  EuiFlexItem,
  EuiSpacer,
  EuiTextColor,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiTabs,
  EuiTab,
  EuiFlexGroup,
  type PropsOf,
  EuiMarkdownFormat,
} from '@elastic/eui';
import { assertNever } from '@kbn/std';
import type { CspFinding } from '../types';
import { CspEvaluationBadge } from '../../../components/csp_evaluation_badge';
import * as TEXT from '../translations';
import { ResourceTab } from './resource_tab';
import { JsonTab } from './json_tab';
import { OverviewTab } from './overview_tab';
import { RuleTab } from './rule_tab';

const tabs = [
  { title: TEXT.OVERVIEW, id: 'overview' },
  { title: TEXT.RULE, id: 'rule' },
  { title: TEXT.RESOURCE, id: 'resource' },
  { title: TEXT.JSON, id: 'json' },
] as const;

export const CodeBlock: React.FC<PropsOf<typeof EuiCodeBlock>> = (props) => (
  <EuiCodeBlock isCopyable paddingSize="s" overflowHeight={300} {...props} />
);

export const Markdown: React.FC<PropsOf<typeof EuiMarkdownFormat>> = (props) => (
  <EuiMarkdownFormat textSize="s" {...props} />
);

type FindingsTab = typeof tabs[number];

interface FindingFlyoutProps {
  onClose(): void;
  findings: CspFinding;
}

const FindingsTab = ({ tab, findings }: { findings: CspFinding; tab: FindingsTab }) => {
  switch (tab.id) {
    case 'overview':
      return <OverviewTab data={findings} />;
    case 'rule':
      return <RuleTab data={findings} />;
    case 'resource':
      return <ResourceTab data={findings} />;
    case 'json':
      return <JsonTab data={findings} />;
    default:
      assertNever(tab);
  }
};

export const FindingsRuleFlyout = ({ onClose, findings }: FindingFlyoutProps) => {
  const [tab, setTab] = useState<FindingsTab>(tabs[0]);

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <CspEvaluationBadge type={findings.result.evaluation} />
          </EuiFlexItem>
          <EuiFlexItem grow style={{ minWidth: 0 }}>
            <EuiTitle size="m" className="eui-textTruncate">
              <EuiTextColor color="primary" title={findings.rule.name}>
                {findings.rule.name}
              </EuiTextColor>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiTabs>
          {tabs.map((v) => (
            <EuiTab key={v.id} isSelected={tab.id === v.id} onClick={() => setTab(v)}>
              {v.title}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <FindingsTab tab={tab} findings={findings} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
