/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { pick } from 'lodash';
import type { Moment } from 'moment';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { WindowParameters } from '@kbn/aiops-utils';
import type { DataView } from '@kbn/data-views-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';

import { timeSeriesDataViewWarning } from '../../../application/utils/time_series_dataview_check';
import { AiopsAppContext, type AiopsAppDependencies } from '../../../hooks/use_aiops_app_context';
import { DataSourceContext } from '../../../hooks/use_data_source';
import { AIOPS_STORAGE_KEYS } from '../../../types/storage';

import { LogRateAnalysisResultsTableRowStateProvider } from '../../log_rate_analysis_results_table/log_rate_analysis_results_table_row_provider';
import { LogRateAnalysisContent } from './log_rate_analysis_content';
import type { LogRateAnalysisResultsData } from '../log_rate_analysis_results';

const localStorage = new Storage(window.localStorage);

/**
 * Props for the LogRateAnalysisContentWrapper component.
 */
export interface LogRateAnalysisContentWrapperProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** Option to make main histogram sticky */
  stickyHistogram?: boolean;
  /** App dependencies */
  appDependencies: AiopsAppDependencies;
  /** On global timefilter update */
  setGlobalState?: any;
  /** Timestamp for start of initial analysis */
  initialAnalysisStart?: number | WindowParameters;
  /** Optional time range */
  timeRange?: { min: Moment; max: Moment };
  /** Elasticsearch query to pass to analysis endpoint */
  esSearchQuery?: estypes.QueryDslQueryContainer;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  /**
   * Optional callback that exposes data of the completed analysis
   * @param d Log rate analysis results data
   */
  onAnalysisCompleted?: (d: LogRateAnalysisResultsData) => void;
  /** Optional flag to indicate whether kibana is running in serverless */
  showFrozenDataTierChoice?: boolean;
  /** Identifier to indicate the plugin utilizing the component */
  embeddingOrigin: string;
}

export const LogRateAnalysisContentWrapper: FC<LogRateAnalysisContentWrapperProps> = ({
  dataView,
  appDependencies,
  setGlobalState,
  initialAnalysisStart,
  timeRange,
  esSearchQuery,
  stickyHistogram,
  barColorOverride,
  barHighlightColorOverride,
  onAnalysisCompleted,
  showFrozenDataTierChoice = true,
  embeddingOrigin,
}) => {
  if (!dataView) return null;

  const warning = timeSeriesDataViewWarning(dataView, 'log_rate_analysis');

  if (warning !== null) {
    return <>{warning}</>;
  }

  const datePickerDeps = {
    ...pick(appDependencies, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
    showFrozenDataTierChoice,
  };

  return (
    <AiopsAppContext.Provider value={appDependencies}>
      <UrlStateProvider>
        <DataSourceContext.Provider value={{ dataView, savedSearch: null }}>
          <LogRateAnalysisResultsTableRowStateProvider>
            <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
              <DatePickerContextProvider {...datePickerDeps}>
                <LogRateAnalysisContent
                  dataView={dataView}
                  setGlobalState={setGlobalState}
                  initialAnalysisStart={initialAnalysisStart}
                  timeRange={timeRange}
                  esSearchQuery={esSearchQuery}
                  stickyHistogram={stickyHistogram}
                  barColorOverride={barColorOverride}
                  barHighlightColorOverride={barHighlightColorOverride}
                  onAnalysisCompleted={onAnalysisCompleted}
                  embeddingOrigin={embeddingOrigin}
                />
              </DatePickerContextProvider>
            </StorageContextProvider>
          </LogRateAnalysisResultsTableRowStateProvider>
        </DataSourceContext.Provider>
      </UrlStateProvider>
    </AiopsAppContext.Provider>
  );
};
