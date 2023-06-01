/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import { Anomalies } from '../tabs/anomalies/anomalies';
import { Metadata } from '../tabs/metadata/metadata';
import { Processes } from '../tabs/processes/processes';
import { Osquery } from '../tabs/osquery/osquery';
import { FlyoutTabIds, type TabState, type AssetDetailsProps } from '../types';
import { Logs } from '../tabs/logs/logs';
import { Metrics } from '../tabs/metrics/metrics';

type Props = Pick<
  AssetDetailsProps,
  'currentTimeRange' | 'node' | 'nodeType' | 'overrides' | 'onTabsStateChange'
>;

export const Content = ({
  overrides,
  currentTimeRange,
  node,
  nodeType,
  onTabsStateChange,
}: Props) => {
  const onChange = (state: TabState) => {
    if (!onTabsStateChange) {
      return;
    }

    onTabsStateChange(state);
  };

  return (
    <>
      <TabPanel activeWhen={FlyoutTabIds.ANOMALIES}>
        <Anomalies nodeName={node.name} onClose={overrides?.anomalies?.onClose} />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.LOGS}>
        <Logs nodeName={node.name} nodeType={nodeType} currentTime={currentTimeRange.to} />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.METADATA}>
        <Metadata
          currentTimeRange={currentTimeRange}
          nodeName={node.name}
          nodeType={nodeType}
          showActionsColumn={overrides?.metadata?.showActionsColumn}
          search={overrides?.metadata?.query}
          onSearchChange={(query) => onChange({ metadata: { query } })}
        />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.METRICS}>
        <Metrics
          currentTime={currentTimeRange.to}
          accountId={overrides?.metrics?.accountId}
          customMetrics={overrides?.metrics?.customMetrics}
          region={overrides?.metrics?.region}
          nodeName={node.name}
          nodeType={nodeType}
        />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.OSQUERY}>
        <Osquery nodeName={node.name} nodeType={nodeType} currentTimeRange={currentTimeRange} />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.PROCESSES}>
        <Processes
          nodeName={node.name}
          nodeType={nodeType}
          currentTime={currentTimeRange.to}
          searchFilter={overrides?.processes?.query}
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
