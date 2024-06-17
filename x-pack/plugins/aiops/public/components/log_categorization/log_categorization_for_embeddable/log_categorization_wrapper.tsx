/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Suspense } from 'react';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { CoreStart } from '@kbn/core/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { StorageContextProvider } from '@kbn/ml-local-storage';

import { pick } from 'lodash';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { AIOPS_STORAGE_KEYS } from '../../../types/storage';
import type { AiopsAppDependencies } from '../../../hooks/use_aiops_app_context';
import { AiopsAppContext } from '../../../hooks/use_aiops_app_context';
import type { LogCategorizationEmbeddableProps } from './log_categorization_for_embeddable';
import { LogCategorizationEmbeddable } from './log_categorization_for_embeddable';

export interface EmbeddableLogCategorizationDeps {
  theme: ThemeServiceStart;
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  i18n: CoreStart['i18n'];
  lens: LensPublicStart;
  fieldFormats: FieldFormatsStart;
  application: CoreStart['application'];
  charts: ChartsPluginStart;
  uiActions: UiActionsStart;
}

export interface LogCategorizationEmbeddableWrapperProps {
  deps: EmbeddableLogCategorizationDeps;
  props: LogCategorizationEmbeddableProps;
  embeddingOrigin?: string;
}

const localStorage = new Storage(window.localStorage);

export const LogCategorizationWrapper: FC<LogCategorizationEmbeddableWrapperProps> = ({
  deps,
  props,
  embeddingOrigin,
}) => {
  const I18nContext = deps.i18n.Context;
  const aiopsAppContextValue = {
    embeddingOrigin,
    ...deps,
  } as unknown as AiopsAppDependencies;

  const datePickerDeps = {
    ...pick(deps, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
  };

  return (
    <I18nContext>
      <AiopsAppContext.Provider value={aiopsAppContextValue}>
        <DatePickerContextProvider {...datePickerDeps}>
          <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
            <Suspense fallback={null}>
              <LogCategorizationEmbeddable
                input={props.input}
                renderViewModeToggle={props.renderViewModeToggle}
              />
            </Suspense>
          </StorageContextProvider>
        </DatePickerContextProvider>
      </AiopsAppContext.Provider>
    </I18nContext>
  );
};

// eslint-disable-next-line import/no-default-export
export default LogCategorizationWrapper;
