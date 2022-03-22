/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';
import { AnomalyTimelineStateService } from './anomaly_timeline_state_service';
import { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import { useMlKibana, useTimefilter } from '../contexts/kibana';
import { mlResultsServiceProvider } from '../services/results_service';
import { AnomalyTimelineService } from '../services/anomaly_timeline_service';
import type { AnomalyExplorerUrlStateService } from './hooks/use_explorer_url_state';
import { AnomalyChartsStateService } from './anomaly_charts_state_service';
import { AnomalyExplorerChartsService } from '../services/anomaly_explorer_charts_service';
import { useTableSeverity } from '../components/controls/select_severity';

export type AnomalyExplorerContextValue =
  | {
      anomalyExplorerCommonStateService: AnomalyExplorerCommonStateService;
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
 * Creates Anomaly Explorer context.
 */
export function useAnomalyExplorerContextValue(
  anomalyExplorerUrlStateService: AnomalyExplorerUrlStateService
): Exclude<AnomalyExplorerContextValue, undefined> {
  const timefilter = useTimefilter();

  const {
    services: {
      mlServices: { mlApiServices },
      uiSettings,
    },
  } = useMlKibana();

  const [, , tableSeverityState] = useTableSeverity();

  const mlResultsService = useMemo(() => mlResultsServiceProvider(mlApiServices), []);

  const anomalyTimelineService = useMemo(() => {
    return new AnomalyTimelineService(timefilter, uiSettings, mlResultsService);
  }, []);

  return useMemo(() => {
    const anomalyExplorerCommonStateService = new AnomalyExplorerCommonStateService(
      anomalyExplorerUrlStateService
    );

    const anomalyTimelineStateService = new AnomalyTimelineStateService(
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
      tableSeverityState
    );

    return {
      anomalyExplorerCommonStateService,
      anomalyTimelineStateService,
      chartsStateService,
    };
  }, []);
}
