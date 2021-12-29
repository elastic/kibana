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
  EuiCode,
  EuiDescriptionList,
  EuiTextColor,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiBadge,
  EuiTabs,
  EuiTab,
  EuiFlexGrid,
  EuiCard,
  PropsOf,
} from '@elastic/eui';
import { assertNever } from '@kbn/std';
import type { CspFinding } from './types';
import { CSPEvaluationBadge } from '../../components/csp_evaluation_badge';

const tabs = ['result', 'rule', 'resource'] as const;

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

export const FindingsRuleFlyout = ({ onClose, findings }: FindingFlyoutProps) => {
  const [tab, setTab] = useState<FindingsTab>('result');
  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
        <EuiTitle size="l">
          <EuiTextColor color="primary">
            <h2>{'Findings'}</h2>
          </EuiTextColor>
        </EuiTitle>
        <EuiSpacer />
        <EuiTabs>
          {tabs.map((v) => (
            <EuiTab
              key={v}
              isSelected={tab === v}
              onClick={() => setTab(v)}
              style={{ textTransform: 'capitalize' }}
            >
              {v}
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

const Cards = ({ data }: { data: Card[] }) => (
  <EuiFlexGrid direction="column" gutterSize={'l'}>
    {data.map((card) => (
      <EuiFlexItem key={card.title} style={{ display: 'block' }}>
        <EuiCard textAlign="left" title={card.title}>
          <EuiDescriptionList
            compressed={false}
            type="column"
            listItems={card.listItems.map((v) => ({ title: v[0], description: v[1] }))}
          />
        </EuiCard>
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

const FindingsTab = ({ tab, findings }: { findings: CspFinding; tab: FindingsTab }) => {
  switch (tab) {
    case 'result':
      return <Cards data={getResultCards(findings)} />;
    case 'rule':
      return <Cards data={getRuleCards(findings)} />;
    case 'resource':
      return <Cards data={getResourceCards(findings)} />;
    default:
      assertNever(tab);
  }
};

const getResourceCards = ({ resource }: CspFinding): Card[] => [
  {
    title: 'Resource',
    listItems: [
      ['Filename', <EuiCode>{resource.filename}</EuiCode>],
      ['Mode', resource.mode],
      ['Path', <EuiCode>{resource.path}</EuiCode>],
      ['Type', resource.type],
      ['UID', resource.uid],
      ['GID', resource.gid],
    ],
  },
];

const getRuleCards = ({ rule }: CspFinding): Card[] => [
  {
    title: 'Rule',
    listItems: [
      ['Benchmark', rule.benchmark],
      ['Name', rule.name],
      ['Description', rule.description],
      ['Remediation', <EuiCode>{rule.remediation}</EuiCode>],
      [
        'Tags',
        rule.tags.map((t) => (
          <EuiBadge key={t} color="default">
            {t}
          </EuiBadge>
        )),
      ],
    ],
  },
];

const getResultCards = ({ result, agent, host, ...rest }: CspFinding): Card[] => [
  {
    title: 'Result',
    listItems: [
      ['Evaluation', <CSPEvaluationBadge type={result.evaluation} />],
      ['Evidence', <EuiCode>{JSON.stringify(result.evidence, null, 2)}</EuiCode>],
      ['Timestamp', rest['@timestamp']],
      result.evaluation === 'failed' && ['Remediation', rest.rule.remediation],
    ].filter(Boolean) as Card['listItems'], // TODO: is a type guard,
  },
  {
    title: 'Agent',
    listItems: [
      ['Name', agent.name],
      ['ID', agent.id],
      ['Type', agent.type],
      ['Version', agent.version],
    ],
  },
  {
    title: 'Host',
    listItems: [
      ['Architecture', host.architecture],
      ['Containerized', host.containerized ? 'true' : 'false'],
      ['Hostname', host.hostname],
      ['ID', host.id],
      ['IP', host.ip.join(',')],
      ['Mac', host.mac.join(',')],
      ['Name', host.name],
    ],
  },
  {
    title: 'OS',
    listItems: [
      ['Codename', host.os.codename],
      ['Family', host.os.family],
      ['Kernel', host.os.kernel],
      ['Name', host.os.name],
      ['Platform', host.os.platform],
      ['Type', host.os.type],
      ['Version', host.os.version],
    ],
  },
];
