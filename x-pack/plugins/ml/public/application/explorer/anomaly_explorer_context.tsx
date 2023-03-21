/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export type AnomalyExplorerContextValue =
  | {
      anomalyExplorerChartsService: AnomalyExplorerChartsService;
      anomalyExplorerCommonStateService: AnomalyExplorerCommonStateService;
      anomalyTimelineService: AnomalyTimelineService;
      anomalyTimelineStateService: AnomalyTimelineStateService;
      chartsStateService: AnomalyChartsStateService;
    }
  | undefined;

/**
 * Context of the Anomaly Explorer page.
 */
export const AnomalyExplorerContext = React.createContext<AnomalyExplorerContextValue>(undefined);

/**
 * Hook for consuming {@link AnomalyExplorerContext}.
 */
export function useAnomalyExplorerContext():
  | Exclude<AnomalyExplorerContextValue, undefined>
  | never {
  const context = useContext(AnomalyExplorerContext);

  if (context === undefined) {
    throw new Error('AnomalyExplorerContext has not been initialized.');
  }

  return context;
}

/**
 * Anomaly Explorer Context Provider.
 */
export const AnomalyExplorerContextProvider: FC = ({ children }) => {
  const [, , anomalyExplorerUrlStateService] = useExplorerUrlState();

  const timefilter = useTimefilter();

  const {
    services: {
      mlServices: { mlApiServices },
      uiSettings,
    },
  } = useMlKibana();

  const [, , tableSeverityState] = useTableSeverity();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mlResultsService = useMemo(() => mlResultsServiceProvider(mlApiServices), []);

  const [anomalyExplorerContextValue, setAnomalyExplorerContextValue] =
    useState<AnomalyExplorerContextValue>(undefined);

  useEffect(() => {
    const anomalyTimelineService = new AnomalyTimelineService(
      timefilter,
      uiSettings,
      mlResultsService
    );

    const anomalyExplorerCommonStateService = new AnomalyExplorerCommonStateService(
      anomalyExplorerUrlStateService
    );

    const anomalyTimelineStateService = new AnomalyTimelineStateService(
      anomalyExplorerUrlStateService,
      anomalyExplorerCommonStateService,
      anomalyTimelineService,
      timefilter
    );

    const anomalyExplorerChartsService = new AnomalyExplorerChartsService(
      timefilter,
      mlApiServices,
      mlResultsService
    );

    const chartsStateService = new AnomalyChartsStateService(
      anomalyExplorerCommonStateService,
      anomalyTimelineStateService,
      anomalyExplorerChartsService,
      anomalyExplorerUrlStateService,
      tableSeverityState
    );

    setAnomalyExplorerContextValue({
      anomalyExplorerChartsService,
      anomalyExplorerCommonStateService,
      anomalyTimelineService,
      anomalyTimelineStateService,
      chartsStateService,
    });

    return () => {
      // upon component unmounting
      // clear any data to prevent next page from rendering old charts
      anomalyExplorerCommonStateService.destroy();
      anomalyTimelineStateService.destroy();
      chartsStateService.destroy();
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
