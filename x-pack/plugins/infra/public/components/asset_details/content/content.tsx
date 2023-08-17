/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import { Anomalies, Metadata, Processes, Osquery, Logs, Overview } from '../tabs';
import { FlyoutTabIds } from '../types';

export const Content = () => {
  return (
    <>
      <TabPanel activeWhen={FlyoutTabIds.ANOMALIES}>
        <Anomalies />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.OVERVIEW}>
        <Overview />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.LOGS}>
        <Logs />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.METADATA}>
        <Metadata />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.OSQUERY}>
        <Osquery />
      </TabPanel>
      <TabPanel activeWhen={FlyoutTabIds.PROCESSES}>
        <Processes />
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
