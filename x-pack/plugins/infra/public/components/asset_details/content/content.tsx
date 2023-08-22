/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { DatePicker } from '../date_picker/date_picker';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import { Anomalies, Metadata, Processes, Osquery, Logs, Overview } from '../tabs';
import { FlyoutTabIds } from '../types';

export const Content = () => {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <DatePickerWrapper
          visibleFor={[
            FlyoutTabIds.OVERVIEW,
            FlyoutTabIds.LOGS,
            FlyoutTabIds.METADATA,
            FlyoutTabIds.PROCESSES,
            FlyoutTabIds.ANOMALIES,
          ]}
        >
          <DatePicker />
        </DatePickerWrapper>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const DatePickerWrapper = ({
  visibleFor,
  children,
}: {
  visibleFor: FlyoutTabIds[];
  children: React.ReactNode;
}) => {
  const { activeTabId } = useTabSwitcherContext();

  return <div hidden={!visibleFor.includes(activeTabId as FlyoutTabIds)}>{children}</div>;
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
