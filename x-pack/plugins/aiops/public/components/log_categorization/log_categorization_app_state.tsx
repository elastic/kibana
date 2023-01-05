/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import type { SavedSearch } from '@kbn/discover-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { SavedSearchSavedObject } from '../../application/utils/search_utils';
import type { AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';

import { LogCategorizationPage } from './log_categorization_page';

const localStorage = new Storage(window.localStorage);

export interface LogCategorizationAppStateProps {
  dataView: DataView;
  savedSearch: SavedSearch | SavedSearchSavedObject | null;
  appDependencies: AiopsAppDependencies;
}

export const LogCategorizationAppState: FC<LogCategorizationAppStateProps> = ({
  dataView,
  savedSearch,
  appDependencies,
}) => {
  return (
    <AiopsAppContext.Provider value={appDependencies}>
      <UrlStateProvider>
        <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
          <LogCategorizationPage dataView={dataView} savedSearch={savedSearch} />
        </StorageContextProvider>
      </UrlStateProvider>
    </AiopsAppContext.Provider>
  );
};
