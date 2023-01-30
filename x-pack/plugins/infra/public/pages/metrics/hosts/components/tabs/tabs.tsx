/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTabbedContent,
  EuiSpacer,
  type EuiTabbedContentTab,
  EuiNotificationBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MetricsGrid } from './metrics/metrics_grid';
import { AlertsTabContent } from './alerts';

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
    append: (
      <EuiNotificationBadge className="eui-alignCenter" size="m">
        {/* TODO: replace with number of real alerts */}
        10
      </EuiNotificationBadge>
    ),
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
