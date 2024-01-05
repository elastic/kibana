/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, combineLatest, type Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { DataContainer } from './data_container';
import { ReloadContextProvider } from '../hooks/use_reload';
import { DataSourceContextProvider } from '../hooks/use_data_source';
import { ChangePointDetectionControlsContextProvider } from '../components/change_point_detection/change_point_detection_context';
import { FilterQueryContextProvider } from '../hooks/use_filters_query';
import { EmbeddableChangePointChartInput, EmbeddableChangePointChartOutput } from './types';

export interface EmbeddableInputTrackerProps {
  input$: Observable<EmbeddableChangePointChartInput>;
  initialInput: EmbeddableChangePointChartInput;
  reload$: Observable<number>;
  onOutputChange: (output: Partial<EmbeddableChangePointChartOutput>) => void;
  onRenderComplete: () => void;
  onLoading: () => void;
  onError: (error: Error) => void;
}

export const EmbeddableInputTracker: FC<EmbeddableInputTrackerProps> = ({
  input$,
  initialInput,
  reload$,
  onOutputChange,
  onRenderComplete,
  onLoading,
  onError,
}) => {
  const input = useObservable(input$, initialInput);

  const [manualReload$] = useState<BehaviorSubject<number>>(
    new BehaviorSubject<number>(initialInput.lastReloadRequestTime ?? Date.now())
  );

  useEffect(
    function updateManualReloadSubject() {
      if (
        input.lastReloadRequestTime === initialInput.lastReloadRequestTime ||
        !input.lastReloadRequestTime
      )
        return;
      manualReload$.next(input.lastReloadRequestTime);
    },
    [input.lastReloadRequestTime, initialInput.lastReloadRequestTime, manualReload$]
  );

  const resultObservable$ = useMemo<Observable<number>>(() => {
    return combineLatest([reload$, manualReload$]).pipe(
      map(([reload, manualReload]) => Math.max(reload, manualReload)),
      distinctUntilChanged()
    );
  }, [manualReload$, reload$]);

  return (
    <ReloadContextProvider reload$={resultObservable$}>
      <DataSourceContextProvider dataViewId={input.dataViewId}>
        <ChangePointDetectionControlsContextProvider>
          <FilterQueryContextProvider timeRange={input.timeRange}>
            <DataContainer
              timeRange={input.timeRange}
              fn={input.fn}
              metricField={input.metricField}
              splitField={input.splitField}
              maxSeriesToPlot={input.maxSeriesToPlot}
              dataViewId={input.dataViewId}
              partitions={input.partitions}
              onLoading={onLoading}
              onRenderComplete={onRenderComplete}
              onError={onError}
              onChange={input.onChange}
              emptyState={input.emptyState}
            />
          </FilterQueryContextProvider>
        </ChangePointDetectionControlsContextProvider>
      </DataSourceContextProvider>
    </ReloadContextProvider>
  );
};
