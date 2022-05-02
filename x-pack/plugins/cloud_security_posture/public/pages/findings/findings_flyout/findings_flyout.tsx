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
  EuiDescriptionList,
  EuiTextColor,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiTabs,
  EuiTab,
  EuiFlexGrid,
  EuiCard,
  EuiFlexGroup,
  EuiIcon,
  type PropsOf,
  EuiMarkdownFormat,
} from '@elastic/eui';
import { assertNever } from '@kbn/std';
import moment from 'moment';
import type { CspFinding } from '../types';
import { CspEvaluationBadge } from '../../../components/csp_evaluation_badge';
import * as TEXT from '../translations';
import cisLogoIcon from '../../../assets/icons/cis_logo.svg';
import k8sLogoIcon from '../../../assets/icons/k8s_logo.svg';
import { ResourceTab } from './resource_tab';
import { JsonTab } from './json_tab';

const tabs = [
  { title: TEXT.REMEDIATION, id: 'remediation' },
  { title: TEXT.RESOURCE, id: 'resource' },
  { title: TEXT.GENERAL, id: 'general' },
  { title: 'JSON', id: 'json' },
] as const;

const CodeBlock: React.FC<PropsOf<typeof EuiCodeBlock>> = (props) => (
  <EuiCodeBlock {...props} isCopyable paddingSize="s" overflowHeight={300} />
);

type FindingsTab = typeof tabs[number];

type EuiListItemsProps = NonNullable<PropsOf<typeof EuiDescriptionList>['listItems']>[number];

interface Card {
  title: string;
  listItems: Array<[EuiListItemsProps['title'], EuiListItemsProps['description']]>;
}

interface FindingFlyoutProps {
  onClose(): void;
  findings: CspFinding;
}

const Cards = ({ data }: { data: Card[] }) => (
  <EuiFlexGrid direction="column" gutterSize={'l'}>
    {data.map((card) => (
      <EuiFlexItem key={card.title} style={{ display: 'block' }}>
        <EuiCard textAlign="left" title={card.title} hasBorder>
          <EuiDescriptionList
            compressed={false}
            type="column"
            listItems={card.listItems.map((v) => ({ title: v[0], description: v[1] }))}
            style={{ flexFlow: 'column' }}
            descriptionProps={{
              style: { width: '100%' },
            }}
          />
        </EuiCard>
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

const FindingsTab = ({ tab, findings }: { findings: CspFinding; tab: FindingsTab }) => {
  switch (tab.id) {
    case 'remediation':
      return <Cards data={getRemediationCards(findings)} />;
    case 'resource':
      return <ResourceTab data={findings} />;
    case 'general':
      return <Cards data={getGeneralCards(findings)} />;
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

const getGeneralCards = ({ rule, ...rest }: CspFinding): Card[] => [
  {
    title: TEXT.RULE,
    listItems: [
      [TEXT.RULE_EVALUATED_AT, moment(rest['@timestamp']).format('MMMM D, YYYY @ HH:mm:ss.SSS')],
      [
        TEXT.FRAMEWORK_SOURCES,
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type={cisLogoIcon} size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type={k8sLogoIcon} size="xxl" />
          </EuiFlexItem>
        </EuiFlexGroup>,
      ],
      [TEXT.CIS_SECTION, rule.section],
      [
        TEXT.PROFILE_APPLICABILITY,
        <EuiMarkdownFormat>{rule.profile_applicability}</EuiMarkdownFormat>,
      ],
      [TEXT.BENCHMARK, rule.benchmark.name],
      [TEXT.NAME, rule.name],
      [TEXT.DESCRIPTION, <EuiMarkdownFormat>{rule.description}</EuiMarkdownFormat>],
      [TEXT.AUDIT, <EuiMarkdownFormat>{rule.audit}</EuiMarkdownFormat>],
      [TEXT.REFERENCES, <EuiMarkdownFormat>{rule.references}</EuiMarkdownFormat>],
    ],
  },
];

const getRemediationCards = ({ result, rule, ...rest }: CspFinding): Card[] => [
  {
    title: TEXT.RESULT_DETAILS,
    listItems: [
      result.expected
        ? [TEXT.EXPECTED, <CodeBlock>{JSON.stringify(result.expected, null, 2)}</CodeBlock>]
        : ['', ''],
      [TEXT.EVIDENCE, <CodeBlock>{JSON.stringify(result.evidence, null, 2)}</CodeBlock>],
      [
        TEXT.RULE_EVALUATED_AT,
        <span>{moment(rest['@timestamp']).format('MMMM D, YYYY @ HH:mm:ss.SSS')}</span>,
      ],
    ],
  },
  {
    title: TEXT.REMEDIATION,
    listItems: [
      ['', <EuiMarkdownFormat>{rule.remediation}</EuiMarkdownFormat>],
      [TEXT.IMPACT, <EuiMarkdownFormat>{rule.impact}</EuiMarkdownFormat>],
      [TEXT.DEFAULT_VALUE, <EuiMarkdownFormat>{rule.default_value}</EuiMarkdownFormat>],
      [TEXT.RATIONALE, <EuiMarkdownFormat>{rule.rationale}</EuiMarkdownFormat>],
    ],
  },
];
