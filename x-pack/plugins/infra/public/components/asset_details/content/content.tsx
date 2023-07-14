/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useAssetDetailsStateContext } from '../hooks/use_asset_details_state';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import { Anomalies, Metadata, Processes, Osquery, Logs, Overview } from '../tabs';
import { FlyoutTabIds, type TabState } from '../types';
import { toTimestampRange } from '../utils';

export const Content = () => {
  const { node, nodeType, overrides, dateRange, onTabsStateChange } = useAssetDetailsStateContext();

  const onChange = (state: TabState) => {
    if (!onTabsStateChange) {
      return;
    }

    onTabsStateChange(state);
  };

  const dateRangeTs = toTimestampRange(dateRange);
  return (
    <>
      <TabPanel activeWhen={FlyoutTabIds.ANOMALIES}>
        <Anomalies nodeName={node.name} onClose={overrides?.anomalies?.onClose} />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.OVERVIEW}>
        <Overview
          dateRange={dateRange}
          nodeName={node.name}
          nodeType={nodeType}
          metricsDataView={overrides?.overview?.metricsDataView}
          logsDataView={overrides?.overview?.logsDataView}
        />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.LOGS}>
        <Logs
          nodeName={node.name}
          nodeType={nodeType}
          currentTimestamp={dateRangeTs.to}
          logViewReference={overrides?.logs?.logView?.reference}
          logViewLoading={overrides?.logs?.logView?.loading}
          search={overrides?.logs?.query}
          onSearchChange={(query) => onChange({ logs: { query } })}
        />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.METADATA}>
        <Metadata
          dateRange={dateRange}
          nodeName={node.name}
          nodeType={nodeType}
          showActionsColumn={overrides?.metadata?.showActionsColumn}
          search={overrides?.metadata?.query}
          onSearchChange={(query) => onChange({ metadata: { query } })}
        />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.OSQUERY}>
        <Osquery nodeName={node.name} nodeType={nodeType} dateRange={dateRange} />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.PROCESSES}>
        <Processes
          nodeName={node.name}
          nodeType={nodeType}
          currentTimestamp={dateRangeTs.to}
          search={overrides?.processes?.query}
          onSearchFilterChange={(query) => onChange({ processes: { query } })}
        />
      </TabPanel>
    </>
  );
};

const TabPanel = ({
  activeWhen,
  children,
}: {
  activeWhen: FlyoutTabIds;
  children: React.ReactNode;
}) => {
  const { renderedTabsSet, activeTabId } = useTabSwitcherContext();

  return renderedTabsSet.current.has(activeWhen) ? (
    <div hidden={activeTabId !== activeWhen}>{children}</div>
  ) : null;
};
