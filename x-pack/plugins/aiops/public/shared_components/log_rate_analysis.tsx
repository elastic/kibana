/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import React, { useEffect, useMemo, useState, type FC } from 'react';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map } from 'rxjs';
import { createBrowserHistory } from 'history';

import datemath from '@elastic/datemath';

import { UrlStateProvider } from '@kbn/ml-url-state';
import { Router } from '@kbn/shared-ux-router';
import { EMBEDDABLE_ORIGIN } from '@kbn/aiops-common/constants';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { UI_SETTINGS } from '@kbn/data-service';
import { LogRateAnalysisReduxProvider } from '@kbn/aiops-log-rate-analysis/state';
import type { TimeRange } from '@kbn/es-query';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import type { SignificantItem } from '@kbn/ml-agg-utils';

import { AiopsAppContext, type AiopsAppDependencies } from '../hooks/use_aiops_app_context';
import { DataSourceContextProvider } from '../hooks/use_data_source';
import { ReloadContextProvider } from '../hooks/use_reload';
import type { AiopsPluginStartDeps } from '../types';

import { LogRateAnalysisDocumentCountChartData } from '../components/log_rate_analysis/log_rate_analysis_content/log_rate_analysis_document_count_chart_data';
import { LogRateAnalysisContent } from '../components/log_rate_analysis/log_rate_analysis_content/log_rate_analysis_content';

/**
 * Only used to initialize internally
 */
export type LogRateAnalysisPropsWithDeps = LogRateAnalysisProps & {
  coreStart: CoreStart;
  pluginStart: AiopsPluginStartDeps;
};

export type LogRateAnalysisSharedComponent = FC<LogRateAnalysisProps>;

export interface LogRateAnalysisProps {
  dataViewId: string;
  timeRange: TimeRange;
  /**
   * Component to render if there are no significant items found
   */
  emptyState?: React.ReactElement;
  /**
   * Outputs the most recent significant items
   */
  onChange?: (significantItems: SignificantItem[]) => void;
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

const LogRateAnalysisWrapper: FC<LogRateAnalysisPropsWithDeps> = ({
  // Component dependencies
  coreStart,
  pluginStart,
  // Component props
  dataViewId,
  timeRange,
  onLoading,
  onError,
  onRenderComplete,
  embeddingOrigin,
  lastReloadRequestTime,
  onChange,
}) => {
  const deps = useMemo(() => {
    const { http, uiSettings, notifications, ...startServices } = coreStart;
    const { lens, data, usageCollection, fieldFormats, charts } = pluginStart;

    return {
      http,
      uiSettings,
      data,
      notifications,
      lens,
      usageCollection,
      fieldFormats,
      charts,
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

  const history = createBrowserHistory();

  const esSearchQuery = { match_all: {} };

  const timeRangeParsed = useMemo(() => {
    if (timeRange) {
      const min = datemath.parse(timeRange.from);
      const max = datemath.parse(timeRange.to);
      if (min && max) {
        return { min, max };
      }
    }
  }, [timeRange]);

  // TODO: Remove data-shared-item as part of https://github.com/elastic/kibana/issues/179376>
  return (
    <div
      data-shared-item=""
      data-test-subj="aiopsEmbeddableLogRateAnalysis"
      css={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        padding: '10px',
      }}
    >
      <Router history={history}>
        <ReloadContextProvider reload$={resultObservable$}>
          <AiopsAppContext.Provider value={aiopsAppContextValue}>
            <UrlStateProvider>
              <DataSourceContextProvider dataViewId={dataViewId}>
                <LogRateAnalysisReduxProvider>
                  <DatePickerContextProvider {...datePickerDeps}>
                    <LogRateAnalysisDocumentCountChartData
                      timeRange={timeRangeParsed}
                      esSearchQuery={esSearchQuery}
                    />
                    <LogRateAnalysisContent
                      esSearchQuery={esSearchQuery}
                      // barColorOverride={barColorOverride}
                      // barHighlightColorOverride={barHighlightColorOverride}
                      // onAnalysisCompleted={onAnalysisCompleted}
                      embeddingOrigin={embeddingOrigin ?? EMBEDDABLE_ORIGIN}
                    />
                  </DatePickerContextProvider>
                </LogRateAnalysisReduxProvider>
              </DataSourceContextProvider>
            </UrlStateProvider>
          </AiopsAppContext.Provider>
        </ReloadContextProvider>
      </Router>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default LogRateAnalysisWrapper;
