/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  useEuiTheme,
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
  EuiPagination,
  EuiFlyoutFooter,
  EuiToolTip,
  EuiDescriptionListProps,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { assertNever } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import type { HttpSetup } from '@kbn/core/public';
import { generatePath } from 'react-router-dom';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { CspEvaluationBadge } from '@kbn/cloud-security-posture';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import {
  CSP_MISCONFIGURATIONS_DATASET,
  getDatasetDisplayName,
} from '../../../common/utils/get_dataset_display_name';
import { truthy } from '../../../../common/utils/helpers';
import { benchmarksNavigation } from '../../../common/navigation/constants';
import cisLogoIcon from '../../../assets/icons/cis_logo.svg';
import { TakeAction } from '../../../components/take_action';
import { TableTab } from './table_tab';
import { JsonTab } from './json_tab';
import { OverviewTab } from './overview_tab';
import { RuleTab } from './rule_tab';
import type { BenchmarkId } from '../../../../common/types_old';
import { CISBenchmarkIcon } from '../../../components/cis_benchmark_icon';
import { BenchmarkName } from '../../../../common/types_old';
import { FINDINGS_FLYOUT, FINDINGS_MISCONFIGS_FLYOUT_DESCRIPTION_LIST } from '../test_subjects';
import { useKibana } from '../../../common/hooks/use_kibana';
import { createDetectionRuleFromBenchmarkRule } from '../utils/create_detection_rule_from_benchmark';
import { CspInlineDescriptionList } from '../../../components/csp_inline_description_list';

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

export const EMPTY_VALUE = '-';

interface FindingFlyoutProps {
  onClose(): void;
  finding: CspFinding;
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

export const BenchmarkIcons = ({
  benchmarkId,
  benchmarkName,
}: {
  benchmarkId: BenchmarkId;
  benchmarkName: BenchmarkName;
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    {benchmarkId.startsWith('cis') && (
      <EuiFlexItem grow={false}>
        <EuiToolTip content="Center for Internet Security">
          <EuiIcon type={cisLogoIcon} size="xl" />
        </EuiToolTip>
      </EuiFlexItem>
    )}
    <EuiFlexItem grow={false}>
      <CISBenchmarkIcon type={benchmarkId} name={benchmarkName} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const RuleNameLink = ({
  ruleFlyoutLink,
  ruleName,
}: {
  ruleFlyoutLink?: string;
  ruleName: string;
}) => {
  return ruleFlyoutLink && ruleName ? (
    <EuiToolTip
      position="top"
      content={i18n.translate(
        'xpack.csp.findings.findingsFlyout.ruleNameTabField.ruleNameTooltip',
        { defaultMessage: 'Manage Rule' }
      )}
    >
      <EuiLink href={ruleFlyoutLink}>{ruleName}</EuiLink>
    </EuiToolTip>
  ) : (
    <>{ruleName}</>
  );
};

const getFlyoutDescriptionList = (finding: CspFinding): EuiDescriptionListProps['listItems'] =>
  [
    finding.resource?.id && {
      title: i18n.translate('xpack.csp.findings.findingsFlyout.flyoutDescriptionList.resourceId', {
        defaultMessage: 'Resource ID',
      }),
      description: finding.resource.id,
    },
    finding.resource?.name && {
      title: i18n.translate(
        'xpack.csp.findings.findingsFlyout.flyoutDescriptionList.resourceName',
        { defaultMessage: 'Resource Name' }
      ),
      description: finding.resource.name,
    },
  ].filter(truthy);

const FindingsTab = ({ tab, finding }: { finding: CspFinding; tab: FindingsTab }) => {
  const { application } = useKibana().services;

  const ruleFlyoutLink =
    // currently we only support rule linking for native CSP findings
    finding.data_stream.dataset === CSP_MISCONFIGURATIONS_DATASET &&
    finding.rule?.benchmark?.version &&
    finding.rule?.benchmark?.id &&
    finding.rule?.id
      ? application.getUrlForApp('security', {
          path: generatePath(benchmarksNavigation.rules.path, {
            benchmarkVersion: finding.rule.benchmark.version.split('v')[1], // removing the v from the version
            benchmarkId: finding.rule.benchmark.id,
            ruleId: finding.rule.id,
          }),
        })
      : undefined;

  switch (tab.id) {
    case 'overview':
      return <OverviewTab data={finding} ruleFlyoutLink={ruleFlyoutLink} />;
    case 'rule':
      return <RuleTab data={finding} ruleFlyoutLink={ruleFlyoutLink} />;
    case 'table':
      return <TableTab data={finding} />;
    case 'json':
      return <JsonTab data={finding} />;
    default:
      assertNever(tab);
  }
};

const isNativeCspFinding = (finding: CspFinding) =>
  finding.data_stream.dataset === CSP_MISCONFIGURATIONS_DATASET;

const MissingFieldsCallout = ({ finding }: { finding: CspFinding }) => {
  const { euiTheme } = useEuiTheme();
  const datasetDisplayName =
    getDatasetDisplayName(finding.data_stream.dataset) || finding.data_stream.dataset;

  return (
    <EuiCallOut
      style={{
        borderRadius: 4,
        overflow: 'hidden',
      }}
      size="s"
      iconType="iInCircle"
      title={
        <span style={{ color: euiTheme.colors.text }}>
          <FormattedMessage
            id="xpack.csp.findings.findingsFlyout.calloutTitle"
            defaultMessage="Some fields not provided by {datasource}"
            values={{
              datasource: datasetDisplayName || 'the data source',
            }}
          />
        </span>
      }
    />
  );
};

export const FindingsRuleFlyout = ({
  onClose,
  finding,
  flyoutIndex,
  findingsCount,
  onPaginate,
}: FindingFlyoutProps) => {
  const [tab, setTab] = useState<FindingsTab>(tabs[0]);

  const createMisconfigurationRuleFn = async (http: HttpSetup) =>
    await createDetectionRuleFromBenchmarkRule(http, finding.rule);

  return (
    <EuiFlyout onClose={onClose} data-test-subj={FINDINGS_FLYOUT}>
      <EuiFlyoutHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <CspEvaluationBadge type={finding.result?.evaluation} />
          </EuiFlexItem>
          <EuiFlexItem grow style={{ minWidth: 0 }}>
            <EuiTitle size="m" className="eui-textTruncate">
              <EuiTextColor color="primary" title={finding.rule?.name}>
                {finding.rule?.name}
              </EuiTextColor>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <div
          css={css`
            line-height: 20px;
            margin-top: ${euiThemeVars.euiSizeM};
          `}
        >
          <CspInlineDescriptionList
            testId={FINDINGS_MISCONFIGS_FLYOUT_DESCRIPTION_LIST}
            listItems={getFlyoutDescriptionList(finding)}
          />
        </div>
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
        {!isNativeCspFinding(finding) && ['overview', 'rule'].includes(tab.id) && (
          <div style={{ marginBottom: 16 }}>
            <MissingFieldsCallout finding={finding} />
          </div>
        )}
        <FindingsTab tab={tab} finding={finding} />
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
