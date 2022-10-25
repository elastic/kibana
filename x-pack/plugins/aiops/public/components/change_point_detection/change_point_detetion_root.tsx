/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import React, { FC } from 'react';
import { PageHeader } from '../page_header';
import { ChangePointDetectionContextProvider } from './change_point_detection_context';
import { DataSourceContext } from '../../hooks/use_data_source';
import { UrlStateProvider } from '../../hooks/use_url_state';
import { SavedSearchSavedObject } from '../../application/utils/search_utils';
import { AiopsAppContext, AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { ChangePointDetectionPage } from './chapge_point_detection_page';

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
          <PageHeader />
          <ChangePointDetectionContextProvider>
            <ChangePointDetectionPage />
          </ChangePointDetectionContextProvider>
        </DataSourceContext.Provider>
      </UrlStateProvider>
    </AiopsAppContext.Provider>
  );
};
