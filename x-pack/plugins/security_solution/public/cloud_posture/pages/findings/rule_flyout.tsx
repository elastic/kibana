/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
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
  EuiCard,
} from '@elastic/eui';
import { assertNever } from '@kbn/std';
import { CSPFinding } from './types';
import { CSPEvaluationBadge } from '../../components/csp_evaluation_badge';

const tabs = ['resource', 'rule', 'overview'] as const;

interface CSPTabProps {
  data: CSPFinding;
}

interface FindingFlyoutProps {
  onClose(): void;
  findings: CSPFinding;
}

export const FindingsRuleFlyOut = ({ onClose, findings }: FindingFlyoutProps) => {
  const [tab, setTab] = useState<typeof tabs[number]>('resource');

  const Tab = useCallback(() => {
    switch (tab) {
      case 'overview':
        return <OverviewTab data={findings} />;
      case 'rule':
        return <RuleTab data={findings} />;
      case 'resource':
        return <ResourceTab data={findings} />;
    }

    assertNever(tab);
  }, [findings, tab]);

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader aria-labelledby={'foo'}>
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
        <Tab />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const getTagsBadges = (v: string[]) => (
  <>
    {v.map((x) => (
      <EuiBadge color="default">{x}</EuiBadge>
    ))}
  </>
);

const OverviewTab = ({ data }: CSPTabProps) => (
  <TabWrapper>
    <EuiCard textAlign="left" title={'Agent'}>
      <EuiDescriptionList
        compressed={false}
        type="column"
        listItems={[
          { title: 'Name', description: data.agent.name },
          { title: 'ID', description: data.agent.id },
          { title: 'Type', description: data.agent.type },
          { title: 'Version', description: data.agent.version },
        ]}
      />
    </EuiCard>
    <EuiCard textAlign="left" title={'Host'}>
      <EuiDescriptionList
        type="column"
        compressed={false}
        listItems={[
          { title: 'Architecture', description: data.host.architecture },
          { title: 'Containerized', description: data.host.containerized ? 'true' : 'false' },
          { title: 'Hostname', description: data.host.hostname },
          { title: 'ID', description: data.host.id },
          { title: 'IP', description: data.host.ip.join(',') },
          { title: 'Mac', description: data.host.mac.join(',') },
          { title: 'Name', description: data.host.name },
        ]}
      />
    </EuiCard>
    <EuiCard textAlign="left" title={'OS'}>
      <EuiDescriptionList
        type="column"
        compressed={false}
        listItems={[
          { title: 'Codename', description: data.host.os.codename },
          { title: 'Family', description: data.host.os.family },
          { title: 'Kernel', description: data.host.os.kernel },
          { title: 'Name', description: data.host.os.name },
          { title: 'Platform', description: data.host.os.platform },
          { title: 'Type', description: data.host.os.type },
          { title: 'Version', description: data.host.os.version },
        ]}
      />
    </EuiCard>
  </TabWrapper>
);

const RuleTab = ({ data }: CSPTabProps) => (
  <TabWrapper>
    <EuiCard textAlign="left" title={'Rule'}>
      <EuiDescriptionList
        compressed={false}
        type="column"
        listItems={[
          { title: 'Benchmark', description: data.rule.benchmark },
          { title: 'Name', description: data.rule.name },
          { title: 'Description', description: data.rule.description },
          { title: 'Tags', description: getTagsBadges(data.rule.tags) },
          { title: 'Remediation', description: <EuiCode>{data.rule.remediation}</EuiCode> },
        ]}
      />
    </EuiCard>
  </TabWrapper>
);

const ResourceTab = ({ data }: CSPTabProps) => (
  <TabWrapper>
    <EuiCard textAlign="left" title={'Resource'}>
      <EuiDescriptionList
        compressed={false}
        type="column"
        listItems={[
          { title: 'Filename', description: <EuiCode>{data.resource.filename}</EuiCode> },
          { title: 'Mode', description: data.resource.mode },
          { title: 'Path', description: <EuiCode>{data.resource.path}</EuiCode> },
          { title: 'Type', description: data.resource.type },
          { title: 'UID', description: data.resource.uid },
          { title: 'GID', description: data.resource.gid },
        ]}
      />
    </EuiCard>
    <EuiCard textAlign="left" title={'Result'}>
      <EuiDescriptionList
        compressed={false}
        type="column"
        listItems={[
          {
            title: 'Evaluation',
            description: <CSPEvaluationBadge type={data.result.evaluation} />,
          },
          {
            title: 'Evidence',
            description: <EuiCode>{JSON.stringify(data.result.evidence, null, 2)}</EuiCode>,
          },
        ]}
      />
    </EuiCard>
  </TabWrapper>
);

const TabWrapper: React.FC = ({ children }) => (
  <div style={{ display: 'grid', gridGap: 15, gridAutoFlow: 'rows' }}>{children}</div>
);
