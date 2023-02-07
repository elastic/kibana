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

interface WrapperProps {
  children: React.ReactElement;
  isSelected: boolean;
}

const labels = {
  alerts: i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.title', {
    defaultMessage: 'Alerts',
  }),
  metrics: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.title', {
    defaultMessage: 'Metrics',
  }),
};

const tabs = [
  {
    id: tabIds.METRICS,
    name: labels.metrics,
    'data-test-subj': 'hostsView-tabs-metrics',
  },
  {
    id: tabIds.ALERTS,
    name: labels.alerts,
    append: <AlertsTabBadge />,
    'data-test-subj': 'hostsView_tab_alerts',
  },
];

const initialRenderedTabsMap = tabs.reduce((map, tab, pos) => {
  return { ...map, [tab.id]: pos === 0 };
}, {});

const Wrapper = ({ children, isSelected }: WrapperProps) => {
  return (
    <div hidden={!isSelected}>
      <EuiSpacer />
      {children}
    </div>
  );
};

export const Tabs = () => {
  // This map allow to keep track of what tabs content have been rendered the first time.
  // We need it in order to load a tab content only if it gets clicked, and then keep it in the DOM for performance improvement.
  const renderedTabsMap = useRef(initialRenderedTabsMap as Record<TabId, boolean>);

  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        {...tab}
        key={index}
        onClick={() => {
          renderedTabsMap.current[tab.id] = true; // On a tab click, mark the tab content as allowed to be rendered
          setSelectedTabId(tab.id);
        }}
        isSelected={tab.id === selectedTabId}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  // We memoize the instances of these tabs to prevent a full rerender and data fetching on tab switch
  const metricTab = useMemo(() => <MetricsGrid />, []);
  const alertsTab = useMemo(() => <AlertsTabContent />, []);

  return (
    <>
      <EuiTabs>{renderTabs()}</EuiTabs>
      {renderedTabsMap.current[tabIds.METRICS] && (
        <Wrapper isSelected={selectedTabId === tabIds.METRICS}>{metricTab}</Wrapper>
      )}
      {renderedTabsMap.current[tabIds.ALERTS] && (
        <Wrapper isSelected={selectedTabId === tabIds.ALERTS}>{alertsTab}</Wrapper>
      )}
    </>
  );
};
