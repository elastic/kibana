/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { map } from 'rxjs/operators';
import { pick } from 'lodash';
import { EuiThemeProvider as StyledComponentsThemeProvider } from '@kbn/kibana-react-plugin/common';
import { EuiSpacer } from '@elastic/eui';

import { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { DatePickerContextProvider, mlTimefilterRefresh$ } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';

import { type Observable } from 'rxjs';
import { DataSourceContext } from '../../hooks/use_data_source';
import { AiopsAppContext, AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';

import { PageHeader } from '../page_header';

import { ChangePointDetectionPage } from './change_point_detection_page';
import {
  ChangePointDetectionContextProvider,
  ChangePointDetectionControlsContextProvider,
} from './change_point_detection_context';
import { timeSeriesDataViewWarning } from '../../application/utils/time_series_dataview_check';
import { ReloadContextProvider } from '../../hooks/use_reload';

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
}

export const ChangePointDetectionAppState: FC<ChangePointDetectionAppStateProps> = ({
  dataView,
  savedSearch,
  appDependencies,
}) => {
  const datePickerDeps = {
    ...pick(appDependencies, ['data', 'http', 'notifications', 'theme', 'uiSettings']),
    toMountPoint,
    wrapWithTheme,
    uiSettingsKeys: UI_SETTINGS,
  };

  const warning = timeSeriesDataViewWarning(dataView, 'change_point_detection');

  const reload$ = useMemo<Observable<number>>(() => {
    return mlTimefilterRefresh$.pipe(map((v) => v.lastRefresh));
  }, []);

  if (warning !== null) {
    return <>{warning}</>;
  }

  const PresentationContextProvider =
    appDependencies.presentationUtil?.ContextProvider ?? React.Fragment;

  const CasesContext = appDependencies.cases?.ui.getCasesContext() ?? React.Fragment;
  const casesPermissions = appDependencies.cases?.helpers.canUseCases();

  return (
    <PresentationContextProvider>
      <StyledComponentsThemeProvider>
        <CasesContext owner={[]} permissions={casesPermissions!}>
          <AiopsAppContext.Provider value={appDependencies}>
            <UrlStateProvider>
              <DataSourceContext.Provider value={{ dataView, savedSearch }}>
                <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
                  <DatePickerContextProvider {...datePickerDeps}>
                    <PageHeader />
                    <EuiSpacer />
                    <ReloadContextProvider reload$={reload$}>
                      <ChangePointDetectionContextProvider>
                        <ChangePointDetectionControlsContextProvider>
                          <ChangePointDetectionPage />
                        </ChangePointDetectionControlsContextProvider>
                      </ChangePointDetectionContextProvider>
                    </ReloadContextProvider>
                  </DatePickerContextProvider>
                </StorageContextProvider>
              </DataSourceContext.Provider>
            </UrlStateProvider>
          </AiopsAppContext.Provider>
        </CasesContext>
      </StyledComponentsThemeProvider>
    </PresentationContextProvider>
  );
};
