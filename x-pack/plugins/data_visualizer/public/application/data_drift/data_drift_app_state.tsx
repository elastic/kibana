/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { pick } from 'lodash';

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { useLocation } from 'react-router-dom';
import { parse } from 'query-string';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';
import type { InitialSettings } from './use_data_drift_result';
import {
  DataDriftStateManagerContext,
  defaultSearchQuery,
  useDataDriftStateManager,
} from './use_state_manager';
import { DV_STORAGE_KEYS } from '../index_data_visualizer/types/storage';
import { getCoreStart, getPluginsStart } from '../../kibana_services';
import { DataDriftPage } from './data_drift_page';
import { DataSourceContext } from '../common/hooks/data_source_context';

const localStorage = new Storage(window.localStorage);

export interface DataDriftDetectionAppStateProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | null;
}

export type DataDriftSpec = typeof DataDriftDetectionAppState;

const getStr = (arg: string | string[] | null, fallbackStr?: string): string => {
  if (arg === undefined || arg == null) return fallbackStr ?? '';

  if (typeof arg === 'string') return arg.replaceAll(`'`, '');

  if (Array.isArray(arg)) return arg.join(',');

  return '';
};

export const DataDriftDetectionAppState: FC<DataDriftDetectionAppStateProps> = ({
  dataView,
  savedSearch,
}) => {
  if (!(dataView || savedSearch)) {
    throw Error('No data view or saved search available.');
  }

  const coreStart = getCoreStart();
  const {
    data,
    maps,
    embeddable,
    discover,
    share,
    security,
    fileUpload,
    lens,
    dataViewFieldEditor,
    uiActions,
    charts,
    unifiedSearch,
  } = getPluginsStart();
  const services = {
    ...coreStart,
    data,
    maps,
    embeddable,
    discover,
    share,
    security,
    fileUpload,
    lens,
    dataViewFieldEditor,
    uiActions,
    charts,
    unifiedSearch,
  };
  const datePickerDeps = {
    ...pick(services, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
  };
  const location = useLocation();

  const params = parse(location.search, {
    sort: false,
  });

  const initialSettings: InitialSettings = {
    index: getStr(params.index, dataView.id),
    comparison: getStr(params.comparison, dataView.getIndexPattern()),
    reference: getStr(params.reference, dataView.getIndexPattern()),
    timeField: getStr(params.timeField, dataView.getTimeField()?.name),
  };

  const referenceStateManager = useDataDriftStateManager({
    id: 'referenceDataDriftData',
    indexPattern: getStr(params.reference) ?? dataView.getIndexPattern(),
    searchString: '',
    searchQuery: defaultSearchQuery,
    searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
    filters: [],
    timeField: dataView.timeFieldName,
  });
  const comparisonStateManager = useDataDriftStateManager({
    id: 'comparisonDataDriftData',
    indexPattern: getStr(params.comparison) ?? dataView.getIndexPattern(),
    searchString: '',
    searchQuery: defaultSearchQuery,
    searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
    filters: [],
    timeField: dataView.timeFieldName,
  });

  return (
    <KibanaThemeProvider theme$={coreStart.theme.theme$}>
      <KibanaContextProvider services={{ ...services }}>
        <UrlStateProvider>
          <DataSourceContext.Provider value={{ dataView, savedSearch }}>
            <StorageContextProvider storage={localStorage} storageKeys={DV_STORAGE_KEYS}>
              <DatePickerContextProvider {...datePickerDeps}>
                <DataDriftStateManagerContext.Provider
                  value={{
                    dataView,
                    reference: referenceStateManager,
                    comparison: comparisonStateManager,
                  }}
                >
                  <DataDriftPage initialSettings={initialSettings} />
                </DataDriftStateManagerContext.Provider>
              </DatePickerContextProvider>
            </StorageContextProvider>
          </DataSourceContext.Provider>
        </UrlStateProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>
  );
};
