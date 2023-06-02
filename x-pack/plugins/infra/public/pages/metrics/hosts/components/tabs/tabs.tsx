/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTabs, EuiTab, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useLazyRef } from '../../../../../hooks/use_lazy_ref';
import { MetricsGrid } from './metrics/metrics_grid';
import { AlertsTabContent } from './alerts';

import { AlertsTabBadge } from './alerts_tab_badge';
import { TabIds, useTabId } from '../../hooks/use_tab_id';
import { LogsTabContent } from './logs';

const tabs = [
  {
    id: TabIds.METRICS,
    name: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.title', {
      defaultMessage: 'Metrics',
    }),
    'data-test-subj': 'hostsView-tabs-metrics',
  },
  {
    id: TabIds.LOGS,
    name: i18n.translate('xpack.infra.hostsViewPage.tabs.logs.title', {
      defaultMessage: 'Logs',
    }),
    'data-test-subj': 'hostsView-tabs-logs',
  },
  {
    id: TabIds.ALERTS,
    name: i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.title', {
      defaultMessage: 'Alerts',
    }),
    append: <AlertsTabBadge />,
    'data-test-subj': 'hostsView-tabs-alerts',
  },
];

export const Tabs = () => {
  const [selectedTabId, setSelectedTabId] = useTabId(tabs[0].id);
  // This map allow to keep track of which tabs content have been rendered the first time.
  // We need it in order to load a tab content only if it gets clicked, and then keep it in the DOM for performance improvement.
  const renderedTabsSet = useLazyRef(() => new Set([selectedTabId]));

  const tabEntries = tabs.map((tab, index) => (
    <EuiTab
      {...tab}
      key={index}
      onClick={() => {
        renderedTabsSet.current.add(tab.id); // On a tab click, mark the tab content as allowed to be rendered
        setSelectedTabId(tab.id);
      }}
      isSelected={tab.id === selectedTabId}
      append={tab.append}
    >
      {tab.name}
    </EuiTab>
  ));

  return (
    <>
      <EuiTabs>{tabEntries}</EuiTabs>
      <EuiSpacer />
      {renderedTabsSet.current.has(TabIds.METRICS) && (
        <div hidden={selectedTabId !== TabIds.METRICS}>
          <MetricsGrid />
        </div>
      )}
      {renderedTabsSet.current.has(TabIds.LOGS) && (
        <div hidden={selectedTabId !== TabIds.LOGS}>
          <LogsTabContent />
        </div>
      )}
      {renderedTabsSet.current.has(TabIds.ALERTS) && (
        <div hidden={selectedTabId !== TabIds.ALERTS}>
          <AlertsTabContent />
        </div>
      )}
    </>
  );
};
