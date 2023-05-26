/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AssetDetailsProps } from '../types';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import Metadata from '../tabs/metadata/metadata';
import { Processes } from '../tabs/processes/processes';
import { FlyoutTabIds, TabState } from '../types';

type Props = Pick<
  AssetDetailsProps,
  'currentTimeRange' | 'node' | 'nodeType' | 'overrides' | 'onTabsStateChange'
>;

export const TabContent = ({
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
      <TabPanel activeWhen={FlyoutTabIds.METADATA}>
        <Metadata
          currentTimeRange={currentTimeRange}
          node={node}
          nodeType={nodeType}
          showActionsColumn={overrides?.metadataTab?.showActionsColumn}
          search={overrides?.metadataTab?.query}
          onSearchChange={(query) => onChange({ metadataTab: { query } })}
        />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.PROCESSES}>
        <Processes
          node={node}
          nodeType={nodeType}
          currentTime={currentTimeRange.to}
          searchFilter={overrides?.processTab?.query}
          onSearchFilterChange={(query) => onChange({ processTab: { query } })}
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
