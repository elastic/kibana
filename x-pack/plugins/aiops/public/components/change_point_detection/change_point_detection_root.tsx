/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { pick } from 'lodash';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import { AIOPS_TELEMETRY_ID } from '@kbn/aiops-common/constants';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  DatePickerContextProvider,
  type DatePickerDependencies,
  mlTimefilterRefresh$,
} from '@kbn/ml-date-picker';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';

import type { AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import { DataSourceContext } from '../../hooks/use_data_source';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';

import { PageHeader } from '../page_header';

import { timeSeriesDataViewWarning } from '../../application/utils/time_series_dataview_check';
import { FilterQueryContextProvider } from '../../hooks/use_filters_query';
import { ReloadContextProvider } from '../../hooks/use_reload';
import {
  ChangePointDetectionContextProvider,
  ChangePointDetectionControlsContextProvider,
} from './change_point_detection_context';
import { ChangePointDetectionPage } from './change_point_detection_page';

const localStorage = new Storage(window.localStorage);

/**
 * Props for the ChangePointDetectionAppState component.
 */
export interface ChangePointDetectionAppStateProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | null;
  /** App dependencies */
  appDependencies: AiopsAppDependencies;
  /** Optional flag to indicate whether kibana is running in serverless */
  showFrozenDataTierChoice?: boolean;
}

export const ChangePointDetectionAppState: FC<ChangePointDetectionAppStateProps> = ({
  dataView,
  savedSearch,
  appDependencies,
  showFrozenDataTierChoice = true,
}) => {
  const datePickerDeps: DatePickerDependencies = {
    ...pick(appDependencies, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
    showFrozenDataTierChoice,
  };

  const warning = timeSeriesDataViewWarning(dataView, 'change_point_detection');

  const reload$ = useMemo<Observable<number>>(() => {
    return mlTimefilterRefresh$.pipe(map((v) => v.lastRefresh));
  }, []);

  if (warning !== null) {
    return <>{warning}</>;
  }

  appDependencies.embeddingOrigin = AIOPS_TELEMETRY_ID.AIOPS_DEFAULT_SOURCE;

  const PresentationContextProvider =
    appDependencies.presentationUtil?.ContextProvider ?? React.Fragment;

  const CasesContext = appDependencies.cases?.ui.getCasesContext() ?? React.Fragment;
  const casesPermissions = appDependencies.cases?.helpers.canUseCases();

  return (
    <PresentationContextProvider>
      <KibanaThemeProvider theme={appDependencies.theme}>
        <CasesContext owner={[]} permissions={casesPermissions!}>
          <AiopsAppContext.Provider value={appDependencies}>
            <UrlStateProvider>
              <DataSourceContext.Provider value={{ dataView, savedSearch }}>
                <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
                  <DatePickerContextProvider {...datePickerDeps}>
                    <PageHeader />
                    <EuiSpacer />
                    <ReloadContextProvider reload$={reload$}>
                      <FilterQueryContextProvider>
                        <ChangePointDetectionContextProvider>
                          <ChangePointDetectionControlsContextProvider>
                            <ChangePointDetectionPage />
                          </ChangePointDetectionControlsContextProvider>
                        </ChangePointDetectionContextProvider>
                      </FilterQueryContextProvider>
                    </ReloadContextProvider>
                  </DatePickerContextProvider>
                </StorageContextProvider>
              </DataSourceContext.Provider>
            </UrlStateProvider>
          </AiopsAppContext.Provider>
        </CasesContext>
      </KibanaThemeProvider>
    </PresentationContextProvider>
  );
};
