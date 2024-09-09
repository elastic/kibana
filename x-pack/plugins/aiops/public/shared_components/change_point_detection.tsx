/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';
import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import { EMBEDDABLE_ORIGIN } from '@kbn/aiops-common/constants';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { UI_SETTINGS } from '@kbn/data-service';
import type { TimeRange } from '@kbn/es-query';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { pick } from 'lodash';
import React, { useEffect, useMemo, useState, type FC } from 'react';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map } from 'rxjs';
import {
  ChangePointDetectionControlsContextProvider,
  type ChangePointAnnotation,
} from '../components/change_point_detection/change_point_detection_context';
import { ChartGridEmbeddableWrapper } from '../embeddables/change_point_chart/embeddable_chart_component_wrapper';
import { AiopsAppContext, type AiopsAppDependencies } from '../hooks/use_aiops_app_context';
import { DataSourceContextProvider } from '../hooks/use_data_source';
import { FilterQueryContextProvider } from '../hooks/use_filters_query';
import { ReloadContextProvider } from '../hooks/use_reload';
import type { AiopsPluginStartDeps } from '../types';

/**
 * Only used to initialize internally
 */
export type ChangePointDetectionPropsWithDeps = ChangePointDetectionProps & {
  coreStart: CoreStart;
  pluginStart: AiopsPluginStartDeps;
};

export type ChangePointDetectionSharedComponent = FC<ChangePointDetectionProps>;

export interface ChangePointDetectionProps {
  viewType?: ChangePointDetectionViewType;
  dataViewId: string;
  timeRange: TimeRange;
  fn: 'avg' | 'sum' | 'min' | 'max' | string;
  metricField: string;
  splitField?: string;
  partitions?: string[];
  maxSeriesToPlot?: number;
  /**
   * Component to render if there are no change points found
   */
  emptyState?: React.ReactElement;
  /**
   * Outputs the most recent change point data
   */
  onChange?: (changePointData: ChangePointAnnotation[]) => void;
  /**
   * Last reload request time, can be used for manual reload
   */
  lastReloadRequestTime?: number;
  /** Origin of the embeddable instance */
  embeddingOrigin?: string;
  onLoading: (isLoading: boolean) => void;
  onRenderComplete: () => void;
  onError: (error: Error) => void;
}

const ChangePointDetectionWrapper: FC<ChangePointDetectionPropsWithDeps> = ({
  // Component dependencies
  coreStart,
  pluginStart,
  // Component props
  viewType,
  dataViewId,
  fn,
  metricField,
  splitField,
  partitions,
  maxSeriesToPlot,
  timeRange,
  onLoading,
  onError,
  onRenderComplete,
  embeddingOrigin,
  lastReloadRequestTime,
}) => {
  const deps = useMemo(() => {
    const { http, uiSettings, notifications, ...startServices } = coreStart;
    const { lens, data, usageCollection, fieldFormats } = pluginStart;

    return {
      http,
      uiSettings,
      data,
      notifications,
      lens,
      usageCollection,
      fieldFormats,
      ...startServices,
    };
  }, [coreStart, pluginStart]);

  const datePickerDeps = {
    ...pick(deps, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
  };

  const aiopsAppContextValue = useMemo<AiopsAppDependencies>(() => {
    return {
      embeddingOrigin: embeddingOrigin ?? EMBEDDABLE_ORIGIN,
      ...deps,
    } as unknown as AiopsAppDependencies;
  }, [deps, embeddingOrigin]);

  const [manualReload$] = useState<BehaviorSubject<number>>(
    new BehaviorSubject<number>(lastReloadRequestTime ?? Date.now())
  );

  useEffect(
    function updateManualReloadSubject() {
      if (!lastReloadRequestTime) return;
      manualReload$.next(lastReloadRequestTime);
    },
    [lastReloadRequestTime, manualReload$]
  );

  const resultObservable$ = useMemo<Observable<number>>(() => {
    return combineLatest([manualReload$]).pipe(
      map(([manualReload]) => Math.max(manualReload)),
      distinctUntilChanged()
    );
  }, [manualReload$]);

  // TODO: Remove data-shared-item as part of https://github.com/elastic/kibana/issues/179376>
  return (
    <div
      data-shared-item=""
      data-test-subj="aiopsEmbeddableChangePointChart"
      css={css`
        width: 100%;
      `}
    >
      <KibanaRenderContextProvider {...coreStart}>
        <AiopsAppContext.Provider value={aiopsAppContextValue}>
          <DatePickerContextProvider {...datePickerDeps}>
            <ReloadContextProvider reload$={resultObservable$}>
              <DataSourceContextProvider dataViewId={dataViewId}>
                <FilterQueryContextProvider timeRange={timeRange}>
                  <ChangePointDetectionControlsContextProvider>
                    <ChartGridEmbeddableWrapper
                      viewType={viewType}
                      timeRange={timeRange}
                      fn={fn}
                      metricField={metricField}
                      splitField={splitField}
                      maxSeriesToPlot={maxSeriesToPlot}
                      dataViewId={dataViewId}
                      partitions={partitions}
                      onLoading={onLoading}
                      onRenderComplete={onRenderComplete}
                      onError={onError}
                    />
                  </ChangePointDetectionControlsContextProvider>
                </FilterQueryContextProvider>
              </DataSourceContextProvider>
            </ReloadContextProvider>
          </DatePickerContextProvider>
        </AiopsAppContext.Provider>
      </KibanaRenderContextProvider>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default ChangePointDetectionWrapper;
