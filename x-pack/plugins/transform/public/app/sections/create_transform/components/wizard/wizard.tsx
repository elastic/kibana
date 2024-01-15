/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, createContext, useContext, useMemo } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { pick } from 'lodash';

import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { UI_SETTINGS } from '@kbn/data-plugin/common';

import { useEnabledFeatures } from '../../../../serverless_context';
import type { TransformConfigUnion } from '../../../../../../common/types/transform';

import type { SearchItems } from '../../../../hooks/use_search_items';
import { useAppDependencies } from '../../../../app_dependencies';

import { getTransformWizardStore } from '../../state_management/create_transform_store';

import { TRANSFORM_STORAGE_KEYS } from './storage';
import { WizardSteps } from './wizard_steps';

const localStorage = new Storage(window.localStorage);

export interface WizardContextValue {
  config?: TransformConfigUnion;
  searchItems: SearchItems;
}

export const WizardContext = createContext<WizardContextValue | null>(null);

export const useWizardContext = () => {
  const value = useContext(WizardContext);

  if (value === null) {
    throw new Error('Wizard Context not set');
  }

  return value;
};

export const useTransformConfig = () => {
  const value = useWizardContext();

  if (value.config === undefined) {
    throw new Error('Transform config in Wizard Context not set');
  }

  return value.config;
};

export const useDataView = () => {
  const { searchItems } = useWizardContext();
  return searchItems.dataView;
};

export const useSearchItems = () => {
  const { searchItems } = useWizardContext();
  return searchItems;
};

export const Wizard: FC = () => {
  const appDependencies = useAppDependencies();
  const { showNodeInfo } = useEnabledFeatures();

  const reduxStore = useMemo(() => getTransformWizardStore(), []);

  const datePickerDeps: DatePickerDependencies = {
    ...pick(appDependencies, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
    showFrozenDataTierChoice: showNodeInfo,
  };

  return (
    <ReduxProvider store={reduxStore}>
      <UrlStateProvider>
        <StorageContextProvider storage={localStorage} storageKeys={TRANSFORM_STORAGE_KEYS}>
          <DatePickerContextProvider {...datePickerDeps}>
            <WizardSteps />
          </DatePickerContextProvider>
        </StorageContextProvider>
      </UrlStateProvider>
    </ReduxProvider>
  );
};
