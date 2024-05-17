/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { FC } from 'react';
import React from 'react';

import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';

import { LogRateAnalysisStateProvider } from '@kbn/aiops-components';
import type { AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import { DataSourceContext } from '../../hooks/use_data_source';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';

import { timeSeriesDataViewWarning } from '../../application/utils/time_series_dataview_check';
import { LogRateAnalysisPage } from './log_rate_analysis_page';

const localStorage = new Storage(window.localStorage);

/**
 * Props for the LogRateAnalysisAppState component.
 */
export interface LogRateAnalysisAppStateProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | null;
  /** App dependencies */
  appDependencies: AiopsAppDependencies;
  /** Option to make main histogram sticky */
  stickyHistogram?: boolean;
  /** Optional flag to indicate whether kibana is running in serverless */
  showFrozenDataTierChoice?: boolean;
}

export const LogRateAnalysisAppState: FC<LogRateAnalysisAppStateProps> = ({
  dataView,
  savedSearch,
  appDependencies,
  stickyHistogram,
  showFrozenDataTierChoice = true,
}) => {
  if (!dataView) return null;

  const warning = timeSeriesDataViewWarning(dataView, 'log_rate_analysis');

  if (warning !== null) {
    return <>{warning}</>;
  }

  const datePickerDeps: DatePickerDependencies = {
    ...pick(appDependencies, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
    showFrozenDataTierChoice,
  };

  return (
    <AiopsAppContext.Provider value={appDependencies}>
      <UrlStateProvider>
        <DataSourceContext.Provider value={{ dataView, savedSearch }}>
          <LogRateAnalysisStateProvider>
            <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
              <DatePickerContextProvider {...datePickerDeps}>
                <LogRateAnalysisPage stickyHistogram={stickyHistogram} />
              </DatePickerContextProvider>
            </StorageContextProvider>
          </LogRateAnalysisStateProvider>
        </DataSourceContext.Provider>
      </UrlStateProvider>
    </AiopsAppContext.Provider>
  );
};
