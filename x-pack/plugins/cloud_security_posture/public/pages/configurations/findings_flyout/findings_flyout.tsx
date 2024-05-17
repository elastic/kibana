import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiMarkdownFormat,
  EuiPagination,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTextColor,
  EuiTitle,
  EuiToolTip,
  PropsOf,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { assertNever } from '@kbn/std';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { generatePath } from 'react-router-dom';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import type { BenchmarkId } from '../../../../common/types_old';
import { BenchmarkName } from '../../../../common/types_old';
import cisLogoIcon from '../../../assets/icons/cis_logo.svg';
import { useKibana } from '../../../common/hooks/use_kibana';
import { benchmarksNavigation } from '../../../common/navigation/constants';
import { CISBenchmarkIcon } from '../../../components/cis_benchmark_icon';
import { CspEvaluationBadge } from '../../../components/csp_evaluation_badge';
import { TakeAction } from '../../../components/take_action';
import { FINDINGS_FLYOUT } from '../test_subjects';
import { createDetectionRuleFromBenchmarkRule } from '../utils/create_detection_rule_from_benchmark';
import { JsonTab } from './json_tab';
import { OverviewTab } from './overview_tab';
import { RuleTab } from './rule_tab';
import { TableTab } from './table_tab';

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
    id: 'table',
    title: i18n.translate('xpack.csp.findings.findingsFlyout.tableTabTitle', {
      defaultMessage: 'Table',
    }),
  },
  {
    id: 'json',
    title: i18n.translate('xpack.csp.findings.findingsFlyout.jsonTabTitle', {
      defaultMessage: 'JSON',
    }),
  },
] as const;

const PAGINATION_LABEL = i18n.translate('xpack.csp.findings.findingsFlyout.paginationLabel', {
  defaultMessage: 'Finding navigation',
});

type FindingsTab = (typeof tabs)[number];

interface FindingFlyoutProps {
  onClose(): void;
  findings: CspFinding;
  flyoutIndex?: number;
  findingsCount?: number;
  onPaginate?: (pageIndex: number) => void;
}

export const CodeBlock: React.FC<PropsOf<typeof EuiCodeBlock>> = (props) => (
  <EuiCodeBlock isCopyable paddingSize="s" overflowHeight={300} {...props} />
);

export const CspFlyoutMarkdown: React.FC<PropsOf<typeof EuiMarkdownFormat>> = (props) => (
  <EuiMarkdownFormat textSize="s" {...props} />
);

export const CisKubernetesIcons = ({
  benchmarkId,
  benchmarkName,
}: {
  benchmarkId: BenchmarkId;
  benchmarkName: BenchmarkName;
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiToolTip content="Center for Internet Security">
        <EuiIcon type={cisLogoIcon} size="xl" />
      </EuiToolTip>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <CISBenchmarkIcon type={benchmarkId} name={benchmarkName} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const FindingsTab = ({ tab, findings }: { findings: CspFinding; tab: FindingsTab }) => {
  const { application } = useKibana().services;

  const ruleFlyoutLink = application.getUrlForApp('security', {
    path: generatePath(benchmarksNavigation.rules.path, {
      benchmarkVersion: findings.rule.benchmark.version.split('v')[1], // removing the v from the version
      benchmarkId: findings.rule.benchmark.id,
      ruleId: findings.rule.id,
    }),
  });

  switch (tab.id) {
    case 'overview':
      return <OverviewTab data={findings} ruleFlyoutLink={ruleFlyoutLink} />;
    case 'rule':
      return <RuleTab data={findings} ruleFlyoutLink={ruleFlyoutLink} />;
    case 'table':
      return <TableTab data={findings} />;
    case 'json':
      return <JsonTab data={findings} />;
    default:
      assertNever(tab);
  }
};

export const FindingsRuleFlyout = ({
  onClose,
  findings,
  flyoutIndex,
  findingsCount,
  onPaginate,
}: FindingFlyoutProps) => {
  const [tab, setTab] = useState<FindingsTab>(tabs[0]);

  const createMisconfigurationRuleFn = async (http: HttpSetup) =>
    await createDetectionRuleFromBenchmarkRule(http, findings.rule);

  return (
    <EuiFlyout onClose={onClose} data-test-subj={FINDINGS_FLYOUT}>
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
      <EuiFlyoutFooter>
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          justifyContent={onPaginate ? 'spaceBetween' : 'flexEnd'}
        >
          {onPaginate && (
            <EuiFlexItem grow={false}>
              <EuiPagination
                aria-label={PAGINATION_LABEL}
                pageCount={findingsCount}
                activePage={flyoutIndex}
                onPageClick={onPaginate}
                compressed
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <TakeAction createRuleFn={createMisconfigurationRuleFn} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
