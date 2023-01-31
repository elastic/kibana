/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiTabbedContent,
  EuiSpacer,
  type EuiTabbedContentTab,
  EuiNotificationBadge,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAlertsCount } from '../../../../../hooks/use_alerts_count';
import { MetricsGrid } from './metrics/metrics_grid';
import { AlertsTabContent } from './alerts';
import { infraAlertFeatureIds } from './alerts/config';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';

interface WrapperProps {
  children: React.ReactElement;
}

const Wrapper = ({ children }: WrapperProps) => {
  return (
    <>
      <EuiSpacer />
      {children}
    </>
  );
};

const AlertsTabBadge = () => {
  const { dateRangeTimestamp } = useUnifiedSearchContext();

  const timeRange = useMemo(
    () => ({
      utcFrom: new Date(dateRangeTimestamp.from).toISOString(),
      utcTo: new Date(dateRangeTimestamp.to).toISOString(),
    }),
    [dateRangeTimestamp.from, dateRangeTimestamp.to]
  );

  const { alertsCount, loading } = useAlertsCount({
    featureIds: infraAlertFeatureIds,
    timeRange,
  });

  if (loading) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiNotificationBadge className="eui-alignCenter" size="m">
      {alertsCount?.activeAlertCount}
    </EuiNotificationBadge>
  );
};

const tabs: EuiTabbedContentTab[] = [
  {
    id: 'metrics',
    name: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.title', {
      defaultMessage: 'Metrics',
    }),
    'data-test-subj': 'hostsView-tabs-metrics',
    content: (
      <Wrapper>
        <MetricsGrid />
      </Wrapper>
    ),
  },
  {
    id: 'alerts',
    name: i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.title', {
      defaultMessage: 'Alerts',
    }),
    append: <AlertsTabBadge />,
    'data-test-subj': 'hostsView_tab_alerts',
    content: (
      <Wrapper>
        <AlertsTabContent />
      </Wrapper>
    ),
  },
];

export const Tabs = () => {
  return <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />;
};
