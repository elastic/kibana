/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { takeUntil, distinctUntilChanged, skip } from 'rxjs';
import { from } from 'rxjs';
import { pick } from 'lodash';
import type { CoreStart } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import type { AiopsPluginStartDeps } from '../../types';
import { LogCategorizationFlyout } from './log_categorization_for_flyout';
import { AiopsAppContext, type AiopsAppContextValue } from '../../hooks/use_aiops_app_context';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';

const localStorage = new Storage(window.localStorage);

export async function showCategorizeFlyout(
  field: DataViewField,
  dataView: DataView,
  coreStart: CoreStart,
  plugins: AiopsPluginStartDeps,
  originatingApp: string,
  additionalFilter?: CategorizationAdditionalFilter
): Promise<void> {
  const { overlays, application, i18n } = coreStart;

  return new Promise((resolve, reject) => {
    try {
      const onFlyoutClose = () => {
        flyoutSession.close();
        resolve();
      };

      const appContextValue: AiopsAppContextValue = {
        embeddingOrigin: originatingApp,
        ...coreStart,
        ...plugins,
      };
      const startServices = pick(coreStart, 'analytics', 'i18n', 'theme');
      const datePickerDeps: DatePickerDependencies = {
        ...pick(appContextValue, ['data', 'http', 'notifications', 'theme', 'uiSettings']),
        i18n,
        uiSettingsKeys: UI_SETTINGS,
      };

      const flyoutSession = overlays.openFlyout(
        toMountPoint(
          <KibanaContextProvider
            services={{
              ...coreStart,
            }}
          >
            <AiopsAppContext.Provider value={appContextValue}>
              <DatePickerContextProvider {...datePickerDeps}>
                <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
                  <LogCategorizationFlyout
                    dataView={dataView}
                    savedSearch={null}
                    selectedField={field}
                    onClose={onFlyoutClose}
                    additionalFilter={additionalFilter}
                  />
                </StorageContextProvider>
              </DatePickerContextProvider>
            </AiopsAppContext.Provider>
          </KibanaContextProvider>,
          startServices
        ),
        {
          'data-test-subj': 'aiopsCategorizeFlyout',
          ownFocus: true,
          closeButtonProps: { 'aria-label': 'aiopsCategorizeFlyout' },
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
