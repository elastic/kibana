/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, ReactNode } from 'react';
import { EuiTabs, EuiTab, EuiNotificationBadge } from '@elastic/eui';
import { Process } from '../../../common/types/process_tree';
import { getDetailPanelProcess } from './helpers';
import { DetailPanelProcessTab } from '../DetailPanelProcessTab';

interface SessionViewDetailPanelDeps {
  height?: number;
  selectedProcess: Process | null;
  session?: any;
}

interface EuiTabProps {
  id: string;
  name: string;
  content: ReactNode;
  disabled?: boolean;
  append?: ReactNode;
  prepend?: ReactNode;
}

/**
 * Detail panel in the session view.
 */
export const SessionViewDetailPanel = ({ height, selectedProcess }: SessionViewDetailPanelDeps) => {
  const [selectedTabId, setSelectedTabId] = useState('process');
  const processDetail = getDetailPanelProcess(selectedProcess);
  if (!selectedProcess) {
    return <span>Please select a process</span>;
  }

  const tabs: EuiTabProps[] = [
    {
      id: 'process',
      name: 'Process',
      content: <DetailPanelProcessTab processDetail={processDetail} />,
    },
    {
      id: 'host',
      name: 'Host',
      content: null,
    },
    {
      id: 'alerts',
      disabled: true,
      name: 'Alerts',
      append: (
        <EuiNotificationBadge className="eui-alignCenter" size="m">
          10
        </EuiNotificationBadge>
      ),
      content: null,
    },
  ];

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        disabled={tab.disabled}
        prepend={tab.prepend}
        append={tab.append}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <>
      <EuiTabs size="l" expand>
        {renderTabs()}
      </EuiTabs>
      {tabs.find((obj) => obj.id === selectedTabId)?.content}
    </>
  );
};
