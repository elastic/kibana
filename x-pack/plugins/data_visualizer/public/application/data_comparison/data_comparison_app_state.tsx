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
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  toMountPoint,
  wrapWithTheme,
} from '@kbn/kibana-react-plugin/public';

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
    ...pick(services, ['data', 'http', 'notifications', 'theme', 'uiSettings']),
    toMountPoint,
    wrapWithTheme,
    uiSettingsKeys: UI_SETTINGS,
  };

  return (
    <KibanaThemeProvider theme$={coreStart.theme.theme$}>
      <KibanaContextProvider services={{ ...services }}>
        <UrlStateProvider>
          <DataSourceContext.Provider value={{ dataView, savedSearch }}>
            <StorageContextProvider storage={localStorage} storageKeys={DV_STORAGE_KEYS}>
              <DatePickerContextProvider {...datePickerDeps}>
                <DataComparisonPage />
              </DatePickerContextProvider>
            </StorageContextProvider>
          </DataSourceContext.Provider>
        </UrlStateProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>
  );
};
