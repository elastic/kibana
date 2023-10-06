/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { pick } from 'lodash';
import type { CoreStart } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import type { AiopsPluginStartDeps } from '../../types';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import { LogCategorizationPopover } from './log_categorization_for_popover';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';

const localStorage = new Storage(window.localStorage);

export async function showCategorizeValuePopover(
  field: DataViewField,
  dataView: DataView,
  coreStart: CoreStart,
  plugins: AiopsPluginStartDeps,
  originatingApp: string,
  fieldValue?: string,
  setPopoverContents?: (el: React.ReactElement | null) => void,
  onClose?: () => void
): Promise<void> {
  const { http, theme, application, notifications, uiSettings, i18n } = coreStart;

  const Contents: FC = () => {
    const appDependencies = {
      notifications,
      uiSettings,
      http,
      theme,
      application,
      i18n,
      ...plugins,
    };
    const datePickerDeps: DatePickerDependencies = {
      ...pick(appDependencies, ['data', 'http', 'notifications', 'theme', 'uiSettings']),
      i18n,
      uiSettingsKeys: UI_SETTINGS,
    };

    return (
      <KibanaContextProvider
        services={{
          ...coreStart,
        }}
      >
        <AiopsAppContext.Provider value={appDependencies}>
          <DatePickerContextProvider {...datePickerDeps}>
            <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
              <LogCategorizationPopover
                dataView={dataView}
                savedSearch={null}
                selectedField={field}
                onClose={onClose ?? (() => {})}
                fieldValue={fieldValue}
                embeddingOrigin={originatingApp}
              />
            </StorageContextProvider>
          </DatePickerContextProvider>
        </AiopsAppContext.Provider>
      </KibanaContextProvider>
    );
  };

  if (setPopoverContents !== undefined) {
    setPopoverContents(<Contents />);
  }
}
