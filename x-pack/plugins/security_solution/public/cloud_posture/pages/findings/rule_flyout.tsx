/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
import { CSPFinding } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

const getEvaluationBadge = (v: string) => (
  <EuiBadge color={v === 'passed' ? 'success' : v === 'failed' ? 'danger' : 'default'}>
    {v.toUpperCase()}
  </EuiBadge>
);

const getTagsBadges = (v: string[]) => (
  <>
    {v.map((x) => (
      <EuiBadge color="default">{x}</EuiBadge>
    ))}
  </>
);

const CardTitle = ({ title }: { title: string }) => {
  return (
    <div
      style={{
        borderBottom: '1px solid #eee',
        width: '100%',
        paddingBottom: 5,
      }}
    >
      {title}
    </div>
  );
};
const OverviewTab = ({ data }: { data: any }) => {
  return (
    <div style={{ display: 'grid', gridGap: 15, gridAutoFlow: 'rows' }}>
      <EuiCard
        textAlign="left"
        title={<CardTitle title="Agent" />}
        style={{ gridRow: 1, gridColumn: 1 }}
      >
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
      <EuiCard textAlign="left" title={<CardTitle title="Host" />} style={{ gridRow: 2 }}>
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
      <EuiCard textAlign="left" title={<CardTitle title="OS" />} style={{ gridRow: 3 }}>
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
    </div>
  );
};
const RuleTab = ({ data }: { data: any }) => {
  return (
    <div style={{ display: 'grid', gridGap: 15, gridAutoFlow: 'rows' }}>
      <EuiCard
        textAlign="left"
        title={<CardTitle title="Rule" />}
        style={{ gridRow: 1, gridColumn: 1 }}
      >
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
    </div>
  );
};

const ResourceTab = ({ data }: { data: any }) => {
  return (
    <div style={{ display: 'grid', gridGap: 15, gridAutoFlow: 'rows' }}>
      <EuiCard
        textAlign="left"
        title={<CardTitle title="Resource" />}
        style={{ gridRow: 1, gridColumn: 1 }}
      >
        <EuiDescriptionList
          compressed={false}
          type="column"
          listItems={[
            { title: 'Filename', description: <EuiCode>{data.resource.filename}</EuiCode> },
            { title: 'GID', description: data.resource.gid },
            { title: 'Mode', description: data.resource.mode },
            { title: 'Path', description: <EuiCode>{data.resource.path}</EuiCode> },
            { title: 'Type', description: data.resource.type },
            { title: 'UID', description: data.resource.uid },
          ]}
        />
      </EuiCard>
      <EuiCard
        textAlign="left"
        title={<CardTitle title="Result" />}
        style={{ gridRow: 2, gridColumn: 1 }}
      >
        <EuiDescriptionList
          compressed={false}
          type="column"
          listItems={[
            { title: 'Evaluation', description: getEvaluationBadge(data.result.evaluation) },
            {
              title: 'Evidence',
              description: <EuiCode>{JSON.stringify(data.result.evidence, null, 2)}</EuiCode>,
            },
          ]}
        />
      </EuiCard>
    </div>
  );
};

const tabs = ['resource', 'rule', 'overview'] as const;

export const FindingsRuleFlyOut = ({
  onClose,
  findings,
}: {
  onClose(): void;
  findings: CSPFinding;
}) => {
  console.log({ findings });
  const [tab, setTab] = useState('resource');

  const Tab = () => {
    switch (tab) {
      case 'overview':
        return <OverviewTab data={findings} />;
      case 'rule':
        return <RuleTab data={findings} />;
      case 'resource':
        return <ResourceTab data={findings} />;
    }
    return null;
  };

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader aria-labelledby={'foo'}>
        <EuiTitle size="l">
          <EuiTextColor color="primary">
            <h2>Findings</h2>
          </EuiTextColor>
        </EuiTitle>
        <EuiSpacer />
        <EuiTabs>
          {tabs.map((v) => {
            return (
              <EuiTab
                key={v}
                isSelected={tab === v}
                onClick={() => setTab(v)}
                style={{ textTransform: 'capitalize' }}
              >
                {v}
              </EuiTab>
            );
          })}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Tab />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
