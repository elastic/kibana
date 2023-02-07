/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  EuiTabs,
  EuiTab,
  EuiSpacer,
  EuiNotificationBadge,
  EuiLoadingSpinner,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import { useAlertsCount } from '../../../../../hooks/use_alerts_count';
import { MetricsGrid } from './metrics/metrics_grid';
import { AlertsTabContent } from './alerts';
import { infraAlertFeatureIds } from './alerts/config';
import { useHostsViewContext } from '../../hooks/use_hosts_view';

interface WrapperProps {
  children: React.ReactElement;
  isSelected: boolean;
}

interface AlertsTabBadgeProps {
  count?: number;
  error?: Error;
  loading: boolean;
}

const tabIds = {
  ALERTS: 'alerts',
  METRICS: 'metrics',
};

const labels = {
  alerts: i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.title', {
    defaultMessage: 'Alerts',
  }),
  metrics: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.title', {
    defaultMessage: 'Metrics',
  }),
};

const Wrapper = ({ children, isSelected }: WrapperProps) => {
  return (
    <div hidden={!isSelected}>
      <EuiSpacer />
      {children}
    </div>
  );
};

const AlertsTabBadge = ({ loading, count, error }: AlertsTabBadgeProps) => {
  if (loading) {
    return <EuiLoadingSpinner />;
  }

  if (error) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.countError', {
          defaultMessage:
            'The active alerts count was not correctly retrieved, try reloading the page.',
        })}
      >
        <EuiIcon color="warning" type="alert" />
      </EuiToolTip>
    );
  }

  return (
    <EuiNotificationBadge className="eui-alignCenter" size="m">
      {count}
    </EuiNotificationBadge>
  );
};

export const Tabs = () => {
  const { alertsEsQueryFilter } = useHostsViewContext();

  const { alertsCount, loading, error } = useAlertsCount({
    featureIds: infraAlertFeatureIds,
    filter: alertsEsQueryFilter,
  });

  // This map allow to keep track of what tabs content have been rendered the first time.
  // We need it in order to load a tab content only if it gets clicked, and then keep it in the DOM for performance improvement.
  const renderedTabsMap = useRef({
    [tabIds.METRICS]: true,
    [tabIds.ALERTS]: false,
  });

  const tabs = [
    {
      id: tabIds.METRICS,
      name: labels.metrics,
      'data-test-subj': 'hostsView-tabs-metrics',
    },
    {
      id: tabIds.ALERTS,
      name: labels.alerts,
      append: (
        <AlertsTabBadge count={alertsCount?.activeAlertCount} loading={loading} error={error} />
      ),
      'data-test-subj': 'hostsView_tab_alerts',
    },
  ];

  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        {...tab}
        key={index}
        onClick={() => {
          renderedTabsMap.current[tab.id] = true;
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
