/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { takeUntil, distinctUntilChanged, skip } from 'rxjs/operators';
import { from } from 'rxjs';
// import type { Embeddable } from '@kbn/lens-plugin/public';
import type { CoreStart } from '@kbn/core/public';
// import type { SharePluginStart } from '@kbn/share-plugin/public';
// import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
// import type { LensPublicStart } from '@kbn/lens-plugin/public';

import {
  toMountPoint,
  wrapWithTheme,
  KibanaContextProvider,
} from '@kbn/kibana-react-plugin/public';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { DataPublicPluginStart, UI_SETTINGS } from '@kbn/data-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
// import { AddFieldFilterHandler } from '@kbn/unified-field-list-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { pick } from 'lodash';
import { LogCategorizationFlyout } from './components/log_categorization/log_categorization_for_flyout';
import { AiopsAppContext } from './hooks/use_aiops_app_context';
// import { UrlStateProvider } from './hooks/use_url_state';

// import { getMlGlobalServices } from '../../application/app';
// import { LensLayerSelectionFlyout } from './lens_vis_layer_selection_flyout';

export async function showCategorizeFlyout(
  // embeddable: Embeddable,
  field: DataViewField,
  dataView: DataView,
  coreStart: CoreStart,
  data: DataPublicPluginStart,
  charts: ChartsPluginStart,
  onAddFilter?: (
    field: DataViewField | string,
    value: unknown,
    type: '+' | '-',
    title?: string
  ) => void
  // share: SharePluginStart,
  // data: DataPublicPluginStart
  // lens: LensPublicStart
): Promise<void> {
  const {
    http,
    theme,
    overlays,
    application: { currentAppId$ },
    notifications,
    uiSettings,
  } = coreStart;

  return new Promise(async (resolve, reject) => {
    try {
      const onFlyoutClose = () => {
        flyoutSession.close();
        resolve();
      };

      const appDependencies = { notifications, uiSettings, http, data, charts, theme };
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
                // share,
                // data,
                // lens,
                // mlServices: getMlGlobalServices(http),
              }}
            >
              {/* @ts-expect-error !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! */}
              <AiopsAppContext.Provider value={appDependencies}>
                <DatePickerContextProvider {...datePickerDeps}>
                  {/* <UrlStateProvider> */}
                  <LogCategorizationFlyout
                    dataView={dataView}
                    savedSearch={null}
                    selectedField={field}
                    onAddFilter={onAddFilter}
                    onClose={onFlyoutClose}
                  />
                </DatePickerContextProvider>
                {/* </UrlStateProvider> */}
              </AiopsAppContext.Provider>
              {/* <div>{field.displayName}</div> */}
              {/* <LensLayerSelectionFlyout
                embeddable={embeddable}
                onClose={() => {
                  onFlyoutClose();
                  resolve();
                }}
              /> */}
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
      currentAppId$
        .pipe(skip(1), takeUntil(from(flyoutSession.onClose)), distinctUntilChanged())
        .subscribe(() => {
          flyoutSession.close();
        });
    } catch (error) {
      reject(error);
    }
  });
}
