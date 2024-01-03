/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, createContext, useContext, useEffect } from 'react';
import { isEqual, pick } from 'lodash';

import { EuiSteps } from '@elastic/eui';

import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { getCombinedRuntimeMappings } from '@kbn/ml-runtime-field-utils';

import { useEnabledFeatures } from '../../../../serverless_context';
import type { TransformConfigUnion } from '../../../../../../common/types/transform';

import { matchAllQuery } from '../../../../common';
import type { SearchItems } from '../../../../hooks/use_search_items';
import { useAppDependencies } from '../../../../app_dependencies';

import { useWizardActions } from '../../state_management/create_transform_store';

import {
  applyTransformConfigToDefineState,
  getDefaultStepDefineState,
  euiStepDefine,
} from '../step_define';
import { euiStepCreate } from '../step_create';
import {
  applyTransformConfigToDetailsState,
  getDefaultStepDetailsState,
  euiStepDetails,
} from '../step_details';

import { TRANSFORM_STORAGE_KEYS } from './storage';

const localStorage = new Storage(window.localStorage);

interface WizardContextValue {
  searchItems: SearchItems;
  cloneConfig?: TransformConfigUnion;
}

export const WizardContext = createContext<WizardContextValue | null>(null);

export const useWizardContext = () => {
  const value = useContext(WizardContext);

  if (value === null) {
    throw new Error('Wizard Context not set');
  }

  return value;
};

export const Wizard: FC = React.memo(() => {
  const appDependencies = useAppDependencies();
  const { searchItems, cloneConfig } = useWizardContext();
  const { showNodeInfo } = useEnabledFeatures();
  const { dataView } = searchItems;

  const {
    setAdvancedSourceEditorEnabled,
    setRuntimeMappings,
    setSourceConfigUpdated,
    setStepDefineState,
    setStepDetailsState,
  } = useWizardActions();

  useEffect(() => {
    const initialStepDefineState = applyTransformConfigToDefineState(
      getDefaultStepDefineState(searchItems),
      cloneConfig,
      dataView
    );

    setRuntimeMappings(
      // apply runtime fields from both the index pattern and inline configurations
      getCombinedRuntimeMappings(dataView, cloneConfig?.source?.runtime_mappings)
    );

    const query = cloneConfig?.source?.query;
    if (query !== undefined && !isEqual(query, matchAllQuery)) {
      setAdvancedSourceEditorEnabled(true);
      setSourceConfigUpdated(true);
    }

    setStepDefineState(initialStepDefineState);
    setStepDetailsState(
      applyTransformConfigToDetailsState(getDefaultStepDetailsState(), cloneConfig)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const euiStepsConfig = [euiStepDefine, euiStepDetails, euiStepCreate];

  const datePickerDeps: DatePickerDependencies = {
    ...pick(appDependencies, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
    showFrozenDataTierChoice: showNodeInfo,
  };

  return (
    <UrlStateProvider>
      <StorageContextProvider storage={localStorage} storageKeys={TRANSFORM_STORAGE_KEYS}>
        <DatePickerContextProvider {...datePickerDeps}>
          <EuiSteps className="transform__steps" steps={euiStepsConfig} />
        </DatePickerContextProvider>
      </StorageContextProvider>
    </UrlStateProvider>
  );
});
