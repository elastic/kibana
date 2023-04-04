/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { takeUntil, distinctUntilChanged, skip } from 'rxjs/operators';
import { from } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';

import {
  toMountPoint,
  wrapWithTheme,
  KibanaContextProvider,
} from '@kbn/kibana-react-plugin/public';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { pick } from 'lodash';
import { AiopsAppContext } from './hooks/use_aiops_app_context';
import { LogCategorizationFlyout } from './components/log_categorization/log_categorization_for_flyout';
import { AiopsPluginStartDeps } from './types';

export async function showCategorizeFlyout(
  field: DataViewField,
  dataView: DataView,
  coreStart: CoreStart,
  plugins: AiopsPluginStartDeps,
  onAddFilter?: (field: DataViewField | string, values: unknown, alias?: string) => void
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
                  <LogCategorizationFlyout
                    dataView={dataView}
                    savedSearch={null}
                    selectedField={field}
                    onAddFilter={onAddFilter}
                    onClose={onFlyoutClose}
                  />
                </DatePickerContextProvider>
              </AiopsAppContext.Provider>
            </KibanaContextProvider>,
            theme.theme$
          )
        ),
        {
          'data-test-subj': 'mlFlyoutLensLayerSelector',
          ownFocus: true,
          closeButtonAriaLabel: 'jobSelectorFlyout',
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
