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
import { CspEvaluationBadge } from '../../components/csp_evaluation_badge';
import * as TEXT from './translations';

const tabs = ['remediation', 'resource', 'general'] as const;

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
  const [tab, setTab] = useState<FindingsTab>('remediation');
  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
        <EuiTitle size="l">
          <EuiTextColor color="primary">
            <h2>{TEXT.FINDINGS}</h2>
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
        <EuiCard textAlign="left" title={card.title} hasBorder>
          <EuiDescriptionList
            compressed={false}
            type="column"
            listItems={card.listItems.map((v) => ({ title: v[0], description: v[1] }))}
            style={{
              flexFlow: 'column',
            }}
          />
        </EuiCard>
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

const FindingsTab = ({ tab, findings }: { findings: CspFinding; tab: FindingsTab }) => {
  switch (tab) {
    case 'remediation':
      return <Cards data={getRemediationCards(findings)} />;
    case 'general':
      return <Cards data={getGeneralCards(findings)} />;
    case 'resource':
      return <Cards data={getResourceCards(findings)} />;
    default:
      assertNever(tab);
  }
};

const getResourceCards = ({ resource, host }: CspFinding): Card[] => [
  {
    title: TEXT.RESOURCE,
    listItems: [
      [TEXT.FILENAME, <EuiCode>{resource.filename}</EuiCode>],
      [TEXT.MODE, resource.mode],
      [TEXT.PATH, <EuiCode>{resource.path}</EuiCode>],
      [TEXT.TYPE, resource.type],
      [TEXT.UID, resource.uid],
    ],
  },
  {
    title: TEXT.HOST,
    listItems: [
      [TEXT.ARCHITECTURE, host.architecture],
      [TEXT.CONTAINERIZED, host.containerized ? 'true' : 'false'],
      [TEXT.HOSTNAME, host.hostname],
      [TEXT.ID, host.id],
      [TEXT.IP, host.ip.join(',')],
      [TEXT.MAC, host.mac.join(',')],
      [TEXT.NAME, host.name],
    ],
  },
  {
    title: TEXT.OS,
    listItems: [
      [TEXT.CODENAME, host.os.codename],
      [TEXT.FAMILY, host.os.family],
      [TEXT.KERNEL, host.os.kernel],
      [TEXT.NAME, host.os.name],
      [TEXT.PLATFORM, host.os.platform],
      [TEXT.TYPE, host.os.type],
      [TEXT.VERSION, host.os.version],
    ],
  },
];

const getGeneralCards = ({ rule }: CspFinding): Card[] => [
  {
    title: TEXT.RULE,
    listItems: [
      ['Severity', ''],
      ['Index', ''],
      ['Rule evaluated at', ''],
      ['Framework Sources', ''],
      ['Section', ''],
      ['Profile Applicability', ''],
      ['Profile Applicability', ''],
      ['Audit', ''],
      [TEXT.BENCHMARK, rule.benchmark],
      [TEXT.NAME, rule.name],
      [TEXT.DESCRIPTION, rule.description],
      [
        TEXT.TAGS,
        rule.tags.map((t) => (
          <EuiBadge key={t} color="default">
            {t}
          </EuiBadge>
        )),
      ],
    ],
  },
];

const getRemediationCards = ({ result, agent, host, ...rest }: CspFinding): Card[] => [
  {
    title: TEXT.RESULT,
    listItems: [
      [TEXT.EVALUATION, <CspEvaluationBadge type={result.evaluation} />],
      [TEXT.EVIDENCE, <EuiCode>{JSON.stringify(result.evidence, null, 2)}</EuiCode>],
      [TEXT.TIMESTAMP, <EuiCode>{rest['@timestamp']}</EuiCode>],
    ],
  },
  {
    title: TEXT.REMEDIATION,
    listItems: [
      ['', <EuiCode>{rest.rule.remediation}</EuiCode>],
      [TEXT.IMPACT, rest.rule.impact],
      [TEXT.DEFAULT_VALUE, ''],
      [TEXT.RATIONALE, ''],
    ],
  },
];
