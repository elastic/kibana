/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
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
  PropsOf,
  EuiCodeBlock,
  EuiMarkdownFormat,
  EuiIcon,
} from '@elastic/eui';
import { assertNever } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import cisLogoIcon from '../../../assets/icons/cis_logo.svg';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { CspEvaluationBadge } from '../../../components/csp_evaluation_badge';
import { ResourceTab } from './resource_tab';
import { JsonTab } from './json_tab';
import { OverviewTab } from './overview_tab';
import { RuleTab } from './rule_tab';
import type { BenchmarkId } from '../../../../common/types';
import { CISBenchmarkIcon } from '../../../components/cis_benchmark_icon';
import { BenchmarkName } from '../../../../common/types';

const tabs = [
  {
    id: 'overview',
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTabTitle', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: 'rule',
    title: i18n.translate('xpack.csp.findings.findingsFlyout.ruleTabTitle', {
      defaultMessage: 'Rule',
    }),
  },
  {
    id: 'resource',
    title: i18n.translate('xpack.csp.findings.findingsFlyout.resourceTabTitle', {
      defaultMessage: 'Resource',
    }),
  },
  {
    id: 'json',
    title: i18n.translate('xpack.csp.findings.findingsFlyout.jsonTabTitle', {
      defaultMessage: 'JSON',
    }),
  },
] as const;

type FindingsTab = typeof tabs[number];

interface FindingFlyoutProps {
  onClose(): void;
  findings: CspFinding;
}

export const CodeBlock: React.FC<PropsOf<typeof EuiCodeBlock>> = (props) => (
  <EuiCodeBlock isCopyable paddingSize="s" overflowHeight={300} {...props} />
);

export const Markdown: React.FC<PropsOf<typeof EuiMarkdownFormat>> = (props) => (
  <EuiMarkdownFormat textSize="s" {...props} />
);

export const CisKubernetesIcons = ({
  benchmarkId,
  benchmarkName,
}: {
  benchmarkId: BenchmarkId;
  benchmarkName: BenchmarkName;
}) => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiIcon type={cisLogoIcon} size="xxl" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <CISBenchmarkIcon type={benchmarkId} name={benchmarkName} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

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
            <EuiTab
              key={v.id}
              isSelected={tab.id === v.id}
              onClick={() => setTab(v)}
              data-test-subj={`findings_flyout_tab_${v.id}`}
            >
              {v.title}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody key={tab.id}>
        <FindingsTab tab={tab} findings={findings} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
