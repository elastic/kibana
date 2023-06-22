/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { takeUntil, distinctUntilChanged, skip } from 'rxjs/operators';
import { from } from 'rxjs';
import { pick } from 'lodash';
import type { CoreStart } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import {
  toMountPoint,
  wrapWithTheme,
  KibanaContextProvider,
} from '@kbn/kibana-react-plugin/public';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import type { AiopsPluginStartDeps } from '../../types';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import { LogCategorizationFlyout } from './log_categorization_for_flyout';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';

const localStorage = new Storage(window.localStorage);

export async function showCategorizeFlyout(
  field: DataViewField,
  dataView: DataView,
  coreStart: CoreStart,
  plugins: AiopsPluginStartDeps
): Promise<void> {
  const { http, theme, overlays, application, notifications, uiSettings } = coreStart;

  return new Promise(async (resolve, reject) => {
    try {
      const onFlyoutClose = () => {
        flyoutSession.close();
        resolve();
      };

      const appDependencies = {
        notifications,
        uiSettings,
        http,
        theme,
        application,
        ...plugins,
      };
      const datePickerDeps = {
        ...pick(appDependencies, ['data', 'http', 'notifications', 'theme', 'uiSettings']),
        toMountPoint,
        wrapWithTheme,
        uiSettingsKeys: UI_SETTINGS,
      };

      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          wrapWithTheme(
            <KibanaContextProvider
              services={{
                ...coreStart,
              }}
            >
              <AiopsAppContext.Provider value={appDependencies}>
                <DatePickerContextProvider {...datePickerDeps}>
                  <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
                    <LogCategorizationFlyout
                      dataView={dataView}
                      savedSearch={null}
                      selectedField={field}
                      onClose={onFlyoutClose}
                    />
                  </StorageContextProvider>
                </DatePickerContextProvider>
              </AiopsAppContext.Provider>
            </KibanaContextProvider>,
            theme.theme$
          )
        ),
        {
          'data-test-subj': 'aiopsCategorizeFlyout',
          ownFocus: true,
          closeButtonAriaLabel: 'aiopsCategorizeFlyout',
          onClose: onFlyoutClose,
          size: 'l',
        }
      );

      // Close the flyout when user navigates out of the current plugin
      application.currentAppId$
        .pipe(skip(1), takeUntil(from(flyoutSession.onClose)), distinctUntilChanged())
        .subscribe(() => {
          flyoutSession.close();
        });
    } catch (error) {
      reject(error);
    }
  });
}
