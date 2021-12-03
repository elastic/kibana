/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { RefreshInterval, TimeRange } from '../../../../../../../src/plugins/data/common';
import { ViewMode } from '../../../../../../../src/plugins/embeddable/public';
import { ObservabilityPublicPluginsStart } from '../../..';

interface OverviewDashboardProps {
  timeRange: TimeRange;
  refreshConfig: RefreshInterval;
}

export function OverviewDashboard(props: OverviewDashboardProps) {
  const { timeRange, refreshConfig } = props;
  const { services } = useKibana<ObservabilityPublicPluginsStart>();

  const DashboardContainerByValueRenderer =
    services.dashboard.getDashboardContainerByValueRenderer();

  return (
    <DashboardContainerByValueRenderer
      input={{
        id: '',
        title: 'Observability Overview',

        viewMode: ViewMode.VIEW,
        isFullScreenMode: false,
        useMargins: false,

        timeRange,
        refreshConfig,

        query: {
          query: '',
          language: 'lucene',
        },
        filters: [],

        panels: {},
      }}
    />
  );
}
