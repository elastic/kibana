/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { pick } from 'lodash';

import { EuiCallOut } from '@elastic/eui';

import type { Filter, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { SavedSearch } from '@kbn/discover-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';

import {
  SEARCH_QUERY_LANGUAGE,
  SearchQueryLanguage,
  SavedSearchSavedObject,
} from '../../application/utils/search_utils';
import type { AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import { DataSourceContext } from '../../hooks/use_data_source';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';

import { SpikeAnalysisTableRowStateProvider } from '../spike_analysis_table/spike_analysis_table_row_provider';

import { ExplainLogRateSpikesPage } from './explain_log_rate_spikes_page';

const localStorage = new Storage(window.localStorage);

export interface ExplainLogRateSpikesAppStateProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | SavedSearchSavedObject | null;
  /** App dependencies */
  appDependencies: AiopsAppDependencies;
}

const defaultSearchQuery = {
  match_all: {},
};

export interface AiOpsPageUrlState {
  pageKey: 'AIOPS_INDEX_VIEWER';
  pageUrlState: AiOpsIndexBasedAppState;
}

export interface AiOpsIndexBasedAppState {
  searchString?: Query['query'];
  searchQuery?: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
  filters?: Filter[];
}

export const getDefaultAiOpsListState = (
  overrides?: Partial<AiOpsIndexBasedAppState>
): Required<AiOpsIndexBasedAppState> => ({
  searchString: '',
  searchQuery: defaultSearchQuery,
  searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
  filters: [],
  ...overrides,
});

export const restorableDefaults = getDefaultAiOpsListState();

export const ExplainLogRateSpikesAppState: FC<ExplainLogRateSpikesAppStateProps> = ({
  dataView,
  savedSearch,
  appDependencies,
}) => {
  if (!dataView) return null;

  if (!dataView.isTimeBased()) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.aiops.index.dataViewNotBasedOnTimeSeriesNotificationTitle', {
          defaultMessage: 'The data view "{dataViewTitle}" is not based on a time series.',
          values: { dataViewTitle: dataView.getName() },
        })}
        color="danger"
        iconType="alert"
      >
        <p>
          {i18n.translate('xpack.aiops.index.dataViewNotBasedOnTimeSeriesNotificationDescription', {
            defaultMessage: 'Log rate spike analysis only runs over time-based indices.',
          })}
        </p>
      </EuiCallOut>
    );
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
                <ExplainLogRateSpikesPage />
              </DatePickerContextProvider>
            </StorageContextProvider>
          </SpikeAnalysisTableRowStateProvider>
        </DataSourceContext.Provider>
      </UrlStateProvider>
    </AiopsAppContext.Provider>
  );
};
