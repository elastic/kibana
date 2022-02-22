/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiTabs, EuiTab, EuiNotificationBadge } from '@elastic/eui';
import { EuiTabProps } from '../../types';
import { Process, ProcessEventHost } from '../../../common/types/process_tree';
import { getDetailPanelProcess, getSelectedTabContent } from './helpers';
import { DetailPanelProcessTab } from '../detail_panel_process_tab';
import { DetailPanelHostTab } from '../detail_panel_host_tab';

interface SessionViewDetailPanelDeps {
  selectedProcess: Process | null;
  onProcessSelected?: (process: Process) => void;
}

/**
 * Detail panel in the session view.
 */
export const SessionViewDetailPanel = ({ selectedProcess }: SessionViewDetailPanelDeps) => {
  const [selectedTabId, setSelectedTabId] = useState('process');

  if (!selectedProcess) {
    return <span>Please select a process</span>;
  }

  const processDetail = getDetailPanelProcess(selectedProcess);

  let selectedProcessHost = {} as ProcessEventHost;
  if (selectedProcess.events[0]) {
    selectedProcessHost = selectedProcess.events[0].host;
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
      content: <DetailPanelHostTab processHost={selectedProcessHost} />,
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
      {getSelectedTabContent(tabs, selectedTabId)}
    </>
  );
};
