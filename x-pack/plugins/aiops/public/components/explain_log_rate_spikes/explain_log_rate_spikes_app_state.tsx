/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { pick } from 'lodash';

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';

import type { AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import { DataSourceContext } from '../../hooks/use_data_source';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';

import { SpikeAnalysisTableRowStateProvider } from '../spike_analysis_table/spike_analysis_table_row_provider';

import { ExplainLogRateSpikesPage } from './explain_log_rate_spikes_page';
import { timeSeriesDataViewWarning } from '../../application/utils/time_series_dataview_check';

const localStorage = new Storage(window.localStorage);

export interface ExplainLogRateSpikesAppStateProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | null;
  /** App dependencies */
  appDependencies: AiopsAppDependencies;
  /** Option to make main histogram sticky */
  stickyHistogram?: boolean;
}

export const ExplainLogRateSpikesAppState: FC<ExplainLogRateSpikesAppStateProps> = ({
  dataView,
  savedSearch,
  appDependencies,
  stickyHistogram,
}) => {
  if (!dataView) return null;

  const warning = timeSeriesDataViewWarning(dataView, 'explain_log_rate_spikes');

  if (warning !== null) {
    return <>{warning}</>;
  }

  const datePickerDeps = {
    ...pick(appDependencies, ['data', 'http', 'notifications', 'theme', 'uiSettings']),
    toMountPoint,
    wrapWithTheme,
    uiSettingsKeys: UI_SETTINGS,
  };

  return (
    <AiopsAppContext.Provider value={appDependencies}>
      <UrlStateProvider>
        <DataSourceContext.Provider value={{ dataView, savedSearch }}>
          <SpikeAnalysisTableRowStateProvider>
            <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
              <DatePickerContextProvider {...datePickerDeps}>
                <ExplainLogRateSpikesPage stickyHistogram={stickyHistogram} />
              </DatePickerContextProvider>
            </StorageContextProvider>
          </SpikeAnalysisTableRowStateProvider>
        </DataSourceContext.Provider>
      </UrlStateProvider>
    </AiopsAppContext.Provider>
  );
};
