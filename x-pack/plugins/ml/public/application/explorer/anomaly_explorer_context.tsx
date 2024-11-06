/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useContext, useEffect, useMemo, useState, type FC } from 'react';
import { useTimefilter } from '@kbn/ml-date-picker';
import { AnomalyTimelineStateService } from './anomaly_timeline_state_service';
import { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import { useMlKibana } from '../contexts/kibana';
import { mlResultsServiceProvider } from '../services/results_service';
import { AnomalyTimelineService } from '../services/anomaly_timeline_service';
import { useExplorerUrlState } from './hooks/use_explorer_url_state';
import { AnomalyChartsStateService } from './anomaly_charts_state_service';
import { AnomalyExplorerChartsService } from '../services/anomaly_explorer_charts_service';
import { useTableSeverity } from '../components/controls/select_severity';
import { AnomalyDetectionAlertsStateService } from './alerts';
import { explorerServiceFactory, type ExplorerService } from './explorer_dashboard_service';
import { useMlJobService } from '../services/job_service';

export interface AnomalyExplorerContextValue {
  anomalyExplorerChartsService: AnomalyExplorerChartsService;
  anomalyExplorerCommonStateService: AnomalyExplorerCommonStateService;
  anomalyTimelineService: AnomalyTimelineService;
  anomalyTimelineStateService: AnomalyTimelineStateService;
  chartsStateService: AnomalyChartsStateService;
  anomalyDetectionAlertsStateService: AnomalyDetectionAlertsStateService;
  explorerService: ExplorerService;
}

/**
 * Context of the Anomaly Explorer page.
 */
export const AnomalyExplorerContext = React.createContext<AnomalyExplorerContextValue | undefined>(
  undefined
);

/**
 * Hook for consuming {@link AnomalyExplorerContext}.
 */
export function useAnomalyExplorerContext() {
  const context = useContext(AnomalyExplorerContext);

  if (context === undefined) {
    throw new Error('AnomalyExplorerContext has not been initialized.');
  }

  return context;
}

/**
 * Anomaly Explorer Context Provider.
 */
export const AnomalyExplorerContextProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const [, , anomalyExplorerUrlStateService] = useExplorerUrlState();

  const timefilter = useTimefilter();

  const {
    services: {
      mlServices: { mlApi, mlFieldFormatService },
      uiSettings,
      data,
    },
  } = useMlKibana();
  const mlJobService = useMlJobService();

  const [, , tableSeverityState] = useTableSeverity();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mlResultsService = useMemo(() => mlResultsServiceProvider(mlApi), []);

  const [anomalyExplorerContextValue, setAnomalyExplorerContextValue] = useState<
    AnomalyExplorerContextValue | undefined
  >(undefined);

  // It might look tempting to refactor this into `useMemo()` and just return
  // `anomalyExplorerContextValue`, but these services internally might call other state
  // updates so using `useEffect` is the right thing to do here to not get errors
  // related to React lifecycle methods.
  useEffect(() => {
    const explorerService = explorerServiceFactory(mlJobService, mlFieldFormatService);

    const anomalyTimelineService = new AnomalyTimelineService(
      timefilter,
      uiSettings,
      mlResultsService
    );

    const anomalyExplorerCommonStateService = new AnomalyExplorerCommonStateService(
      anomalyExplorerUrlStateService
    );

    const anomalyTimelineStateService = new AnomalyTimelineStateService(
      mlJobService,
      anomalyExplorerUrlStateService,
      anomalyExplorerCommonStateService,
      anomalyTimelineService,
      timefilter
    );

    const anomalyExplorerChartsService = new AnomalyExplorerChartsService(
      timefilter,
      mlApi,
      mlResultsService
    );

    const chartsStateService = new AnomalyChartsStateService(
      anomalyExplorerCommonStateService,
      anomalyTimelineStateService,
      anomalyExplorerChartsService,
      anomalyExplorerUrlStateService,
      tableSeverityState
    );

    const anomalyDetectionAlertsStateService = new AnomalyDetectionAlertsStateService(
      anomalyTimelineStateService,
      data,
      timefilter
    );

    setAnomalyExplorerContextValue({
      anomalyExplorerChartsService,
      anomalyExplorerCommonStateService,
      anomalyTimelineService,
      anomalyTimelineStateService,
      chartsStateService,
      anomalyDetectionAlertsStateService,
      explorerService,
    });

    return () => {
      // upon component unmounting
      // clear any data to prevent next page from rendering old charts
      anomalyExplorerCommonStateService.destroy();
      anomalyTimelineStateService.destroy();
      chartsStateService.destroy();
      anomalyDetectionAlertsStateService.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (anomalyExplorerContextValue === undefined) {
    return null;
  }

  return (
    <AnomalyExplorerContext.Provider value={anomalyExplorerContextValue}>
      {children}
    </AnomalyExplorerContext.Provider>
  );
};
