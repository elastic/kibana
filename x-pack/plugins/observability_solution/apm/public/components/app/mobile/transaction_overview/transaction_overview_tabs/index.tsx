/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useHistory } from 'react-router-dom';
import { EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';
import { push } from '../../../../shared/links/url_helpers';
import { transactionsTab } from './transactions_tab';
import { osVersionTab } from './os_version_tab';
import { appVersionTab } from './app_version_tab';
import { devicesTab } from './devices_tab';

export interface TabContentProps {
  agentName?: string;
  environment: string;
  start: string;
  end: string;
  kuery: string;
  comparisonEnabled: boolean;
  offset?: string;
  mobileSelectedTab?: string;
}

const tabs = [transactionsTab, appVersionTab, osVersionTab, devicesTab];

export function TransactionOverviewTabs({
  agentName,
  environment,
  start,
  end,
  kuery,
  comparisonEnabled,
  offset,
  mobileSelectedTab,
}: TabContentProps) {
  const history = useHistory();

  const { component: TabContent } =
    tabs.find((tab) => tab.key === mobileSelectedTab) ?? transactionsTab;
  return (
    <>
      <EuiTabs>
        {tabs.map(({ dataTestSubj, key, label }) => (
          <EuiTab
            data-test-subj={dataTestSubj}
            key={key}
            isSelected={key === mobileSelectedTab}
            onClick={() => {
              push(history, {
                query: {
                  mobileSelectedTab: key,
                },
              });
            }}
          >
            {label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      <TabContent
        {...{
          agentName,
          environment,
          start,
          end,
          kuery,
          comparisonEnabled,
          offset,
        }}
      />
    </>
  );
}
