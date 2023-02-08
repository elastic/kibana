/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { pick } from 'lodash';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';

import { i18n } from '@kbn/i18n';
import { DataSourceContext } from '../../hooks/use_data_source';
import { AiopsAppContext, AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';

import { PageHeader } from '../page_header';

import { ChangePointDetectionPage } from './change_point_detection_page';
import { ChangePointDetectionContextProvider } from './change_point_detection_context';

const localStorage = new Storage(window.localStorage);

export interface ChangePointDetectionAppStateProps {
  dataView: DataView;
  savedSearch: SavedSearch | null;
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
          {i18n.translate('xpack.aiops.index.changePointTimeSeriesNotificationDescription', {
            defaultMessage: 'Change point detection only runs over time-based indices.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <AiopsAppContext.Provider value={appDependencies}>
      <UrlStateProvider>
        <DataSourceContext.Provider value={{ dataView, savedSearch }}>
          <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
            <DatePickerContextProvider {...datePickerDeps}>
              <PageHeader />
              <EuiSpacer />
              <ChangePointDetectionContextProvider>
                <ChangePointDetectionPage />
              </ChangePointDetectionContextProvider>
            </DatePickerContextProvider>
          </StorageContextProvider>
        </DataSourceContext.Provider>
      </UrlStateProvider>
    </AiopsAppContext.Provider>
  );
};
