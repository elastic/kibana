/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { DataView } from '@kbn/data-views-plugin/common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { MlStorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { DataSourceContext } from '../../hooks/use_data_source';
import { SavedSearchSavedObject } from '../../application/utils/search_utils';
import { AiopsAppContext, AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';

import { PageHeader } from '../page_header';

import { ChangePointDetectionPage } from './change_point_detection_page';
import { ChangePointDetectionContextProvider } from './change_point_detection_context';

const localStorage = new Storage(window.localStorage);

export interface ChangePointDetectionAppStateProps {
  dataView: DataView;
  savedSearch: SavedSearch | SavedSearchSavedObject | null;
  appDependencies: AiopsAppDependencies;
}

export const ChangePointDetectionAppState: FC<ChangePointDetectionAppStateProps> = ({
  dataView,
  savedSearch,
  appDependencies,
}) => {
  return (
    <AiopsAppContext.Provider value={appDependencies}>
      <UrlStateProvider>
        <DataSourceContext.Provider value={{ dataView, savedSearch }}>
          <MlStorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
            <PageHeader />
            <ChangePointDetectionContextProvider>
              <ChangePointDetectionPage />
            </ChangePointDetectionContextProvider>
          </MlStorageContextProvider>{' '}
        </DataSourceContext.Provider>
      </UrlStateProvider>
    </AiopsAppContext.Provider>
  );
};
