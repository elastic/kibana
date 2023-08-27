/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
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
import { InitialSettings } from './use_data_drift_result';
import {
  DataComparisonStateManagerContext,
  defaultSearchQuery,
  StateManager,
} from './use_state_manager';
import { DV_STORAGE_KEYS } from '../index_data_visualizer/types/storage';
import { getCoreStart, getPluginsStart } from '../../kibana_services';
import { DataComparisonPage } from './data_comparison_page';
import { DataSourceContext } from '../common/hooks/data_source_context';

const localStorage = new Storage(window.localStorage);

export interface DataComparisonDetectionAppStateProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | null;
}

export type DataComparisonSpec = typeof DataComparisonDetectionAppState;

const getStr = (arg: string | string[] | null) => `${arg ? arg : ''}`;

export const DataComparisonDetectionAppState: FC<DataComparisonDetectionAppStateProps> = ({
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
    ...coreStart,
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
    index: getStr(params.index),
    production: getStr(params.production),
    reference: getStr(params.reference),
    timeField: getStr(params.timeField),
  };

  const referenceStateManager = useMemo(
    () =>
      new StateManager({
        id: 'referenceDataDriftData',
        indexPattern: getStr(params.reference) ?? dataView.getIndexPattern(),
        searchString: '',
        searchQuery: defaultSearchQuery,
        searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
        filters: [],
        timeField: dataView.timeFieldName,
      }),
    [params.reference, dataView]
  );
  const productionStateManager = useMemo(
    () =>
      new StateManager({
        id: 'productionDataDriftData',
        indexPattern: getStr(params.production) ?? dataView.getIndexPattern(),
        searchString: '',
        searchQuery: defaultSearchQuery,
        searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
        filters: [],
        timeField: dataView.timeFieldName,
      }),
    [params.production, dataView]
  );

  return (
    <KibanaThemeProvider theme$={coreStart.theme.theme$}>
      <KibanaContextProvider services={{ ...services }}>
        <UrlStateProvider>
          <DataSourceContext.Provider value={{ dataView, savedSearch }}>
            <StorageContextProvider storage={localStorage} storageKeys={DV_STORAGE_KEYS}>
              <DatePickerContextProvider {...datePickerDeps}>
                <DataComparisonStateManagerContext.Provider
                  value={{
                    dataView,
                    reference: referenceStateManager,
                    production: productionStateManager,
                  }}
                >
                  <DataComparisonPage initialSettings={initialSettings} />
                </DataComparisonStateManagerContext.Provider>
              </DatePickerContextProvider>
            </StorageContextProvider>
          </DataSourceContext.Provider>
        </UrlStateProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>
  );
};
