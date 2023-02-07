/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import { EuiTabs, EuiTab, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MetricsGrid } from './metrics/metrics_grid';
import { AlertsTabContent } from './alerts';

import { AlertsTabBadge } from './alerts_tab_badge';
import { TabId, tabIds } from './config';

const tabs = [
  {
    id: tabIds.METRICS,
    name: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.title', {
      defaultMessage: 'Metrics',
    }),
    'data-test-subj': 'hostsView-tabs-metrics',
  },
  {
    id: tabIds.ALERTS,
    name: i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.title', {
      defaultMessage: 'Alerts',
    }),
    append: <AlertsTabBadge />,
    'data-test-subj': 'hostsView_tab_alerts',
  },
];

const initialRenderedTabsMap = tabs.reduce((map, tab, pos) => {
  return { ...map, [tab.id]: pos === 0 };
}, {} as Record<TabId, boolean>);

export const Tabs = () => {
  // This map allow to keep track of which tabs content have been rendered the first time.
  // We need it in order to load a tab content only if it gets clicked, and then keep it in the DOM for performance improvement.
  const renderedTabsMap = useRef(initialRenderedTabsMap);

  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const tabEntries = tabs.map((tab, index) => (
    <EuiTab
      {...tab}
      key={index}
      onClick={() => {
        renderedTabsMap.current[tab.id] = true; // On a tab click, mark the tab content as allowed to be rendered
        setSelectedTabId(tab.id);
      }}
      isSelected={tab.id === selectedTabId}
      append={tab.append}
    >
      {tab.name}
    </EuiTab>
  ));

  // We memoize the instances of these tabs to prevent a full rerender and data fetching on tab switch
  const metricTab = useMemo(() => <MetricsGrid />, []);
  const alertsTab = useMemo(() => <AlertsTabContent />, []);

  return (
    <>
      <EuiTabs>{tabEntries}</EuiTabs>
      <EuiSpacer />
      {renderedTabsMap.current[tabIds.METRICS] && (
        <div hidden={selectedTabId !== tabIds.METRICS}>{metricTab}</div>
      )}
      {renderedTabsMap.current[tabIds.ALERTS] && (
        <div hidden={selectedTabId !== tabIds.ALERTS}>{alertsTab}</div>
      )}
    </>
  );
};
