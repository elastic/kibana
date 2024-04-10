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
import {
  Anomalies,
  Logs,
  Metadata,
  Metrics,
  Osquery,
  Overview,
  Processes,
  Profiling,
} from '../tabs';
import { ContentTabIds } from '../types';

export const Content = () => {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <DatePickerWrapper
          visibleFor={[
            ContentTabIds.OVERVIEW,
            ContentTabIds.LOGS,
            ContentTabIds.METADATA,
            ContentTabIds.METRICS,
            ContentTabIds.PROCESSES,
            ContentTabIds.ANOMALIES,
          ]}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TabPanel activeWhen={ContentTabIds.ANOMALIES}>
          <Anomalies />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.OVERVIEW}>
          <Overview />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.LOGS}>
          <Logs />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.METADATA}>
          <Metadata />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.METRICS}>
          <Metrics />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.OSQUERY}>
          <Osquery />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.PROCESSES}>
          <Processes />
        </TabPanel>
        <TabPanel activeWhen={ContentTabIds.PROFILING}>
          <Profiling />
        </TabPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const DatePickerWrapper = ({ visibleFor }: { visibleFor: ContentTabIds[] }) => {
  const { activeTabId } = useTabSwitcherContext();

  return (
    <div hidden={!visibleFor.includes(activeTabId as ContentTabIds)}>
      <DatePicker />
    </div>
  );
};

const TabPanel = ({
  activeWhen,
  children,
}: {
  activeWhen: ContentTabIds;
  children: React.ReactNode;
}) => {
  const { renderedTabsSet, activeTabId } = useTabSwitcherContext();

  return renderedTabsSet.current.has(activeWhen) ? (
    <div hidden={activeTabId !== activeWhen}>{children}</div>
  ) : null;
};
