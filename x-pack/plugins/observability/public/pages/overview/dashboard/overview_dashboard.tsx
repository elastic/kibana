/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { RefreshInterval, TimeRange } from '../../../../../../../src/plugins/data/common';
import { ViewMode } from '../../../../../../../src/plugins/embeddable/public';
import { ObservabilityPublicPluginsStart } from '../../..';
import { ObservabilityIndexPatterns } from '../../../components/shared/exploratory_view/utils/observability_index_patterns';
import { cpuPanel, logRatePanel } from '../panels';

interface OverviewDashboardProps {
  timeRange: TimeRange;
  refreshConfig: RefreshInterval;
}

// FIXME
type DashboardPanels = any;

export function OverviewDashboard(props: OverviewDashboardProps) {
  const { timeRange, refreshConfig } = props;
  const { services } = useKibana<ObservabilityPublicPluginsStart>();

  const observabilityDataViews = useMemo(
    () => new ObservabilityIndexPatterns(services.data),
    [services]
  );

  const [panels, setPanels] = useState<DashboardPanels>(undefined);

  useEffect(() => {
    (async () => {
      const panelList = await Promise.all([
        logRatePanel(observabilityDataViews, 1, { x: 0, y: 0, w: 20, h: 20 }),
        cpuPanel(observabilityDataViews, 2, { x: 20, y: 0, w: 20, h: 20 }),
      ]);

      setPanels(
        panelList.reduce<DashboardPanels>((obj, panel, i) => {
          const id = i + 1;

          obj[id] = panel;
          return obj;
        }, {})
      );
    })();
  }, [observabilityDataViews]);

  const DashboardContainerByValueRenderer =
    services.dashboard.getDashboardContainerByValueRenderer();

  // FIXME Do a spinner
  if (!panels) {
    return null;
  }

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

        panels,
      }}
    />
  );
}
