/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';
import { transactionsTab } from './transactions_tab';

export interface TabContentProps {
  environment: string;
  start: string;
  end: string;
  kueryWithMobileFilters: string;
}

const tabs = [transactionsTab];

export function TransactionOverviewTabs({
  environment,
  start,
  end,
  kueryWithMobileFilters,
}: TabContentProps) {
  const [currentTab, setCurrentTab] = useState(transactionsTab.key);

  const { component: TabContent } =
    tabs.find((tab) => tab.key === currentTab) ?? transactionsTab;
  return (
    <>
      <EuiTabs>
        {tabs.map(({ dataTestSubj, key, label }) => (
          <EuiTab
            data-test-subj={dataTestSubj}
            key={key}
            isSelected={key === currentTab}
            onClick={() => {
              setCurrentTab(key);
            }}
          >
            {label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      <TabContent
        {...{
          environment,
          start,
          end,
          kueryWithMobileFilters,
        }}
      />
    </>
  );
}
