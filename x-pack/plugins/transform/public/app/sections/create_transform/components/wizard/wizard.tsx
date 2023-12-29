/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, createContext, useContext, useEffect, useState, useMemo } from 'react';
import { pick } from 'lodash';

import { EuiSteps, EuiStepStatus } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import { getCombinedRuntimeMappings } from '@kbn/ml-runtime-field-utils';

import { useEnabledFeatures } from '../../../../serverless_context';
import type { TransformConfigUnion } from '../../../../../../common/types/transform';

import { getCreateTransformRequestBody } from '../../../../common';
import type { SearchItems } from '../../../../hooks/use_search_items';
import { useAppDependencies } from '../../../../app_dependencies';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';
import { WIZARD_STEPS } from '../../state_management/wizard_slice';

import {
  applyTransformConfigToDefineState,
  getDefaultStepDefineState,
  euiStepDefine,
} from '../step_define';
import { getDefaultStepCreateState, StepCreateForm, StepCreateSummary } from '../step_create';
import {
  applyTransformConfigToDetailsState,
  getDefaultStepDetailsState,
  euiStepDetails,
} from '../step_details';
import { WizardNav } from '../wizard_nav';

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
  const { searchItems, cloneConfig } = useWizardContext();
  const { showNodeInfo } = useEnabledFeatures();
  const appDependencies = useAppDependencies();
  const {
    ml: { FieldStatsFlyoutProvider },
    uiSettings,
    data,
    fieldFormats,
    charts,
  } = appDependencies;
  const { dataView } = searchItems;

  const currentStep = useWizardSelector((s) => s.wizard.currentStep);
  const stepDefineState = useWizardSelector((s) => s.stepDefine);
  const stepDetailsState = useWizardSelector((s) => s.stepDetails);
  const { setCurrentStep, setRuntimeMappings, setStepDefineState, setStepDetailsState } =
    useWizardActions();

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
    setStepDefineState(initialStepDefineState);
    setStepDetailsState(
      applyTransformConfigToDetailsState(getDefaultStepDetailsState(), cloneConfig)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The CREATE state
  const [stepCreateState, setStepCreateState] = useState(getDefaultStepCreateState);

  const stepCreate = useMemo(() => {
    return {
      title: i18n.translate('xpack.transform.transformsWizard.stepCreateTitle', {
        defaultMessage: 'Create',
      }),
      children: (
        <>
          {currentStep === WIZARD_STEPS.CREATE && stepDefineState && stepDetailsState ? (
            <StepCreateForm
              createDataView={stepDetailsState.createDataView}
              transformId={stepDetailsState.transformId}
              transformConfig={getCreateTransformRequestBody(
                dataView,
                stepDefineState,
                stepDetailsState
              )}
              onChange={setStepCreateState}
              overrides={stepCreateState}
              timeFieldName={stepDetailsState.dataViewTimeField}
            />
          ) : (
            <StepCreateSummary />
          )}
          {currentStep === WIZARD_STEPS.CREATE && !stepCreateState.created && (
            <WizardNav previous={() => setCurrentStep(WIZARD_STEPS.DETAILS)} />
          )}
        </>
      ),
      status: currentStep >= WIZARD_STEPS.CREATE ? undefined : ('incomplete' as EuiStepStatus),
    };
  }, [
    dataView,
    currentStep,
    setCurrentStep,
    setStepCreateState,
    stepDetailsState,
    stepCreateState,
    stepDefineState,
  ]);

  const euiStepsConfig = [euiStepDefine, euiStepDetails, stepCreate];

  const datePickerDeps: DatePickerDependencies = {
    ...pick(appDependencies, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
    showFrozenDataTierChoice: showNodeInfo,
  };

  const fieldStatsServices: FieldStatsServices = useMemo(
    () => ({
      uiSettings,
      dataViews: data.dataViews,
      data,
      fieldFormats,
      charts,
    }),
    [uiSettings, data, fieldFormats, charts]
  );

  if (!stepDefineState || !stepDetailsState) return null;

  return (
    <FieldStatsFlyoutProvider
      dataView={dataView}
      fieldStatsServices={fieldStatsServices}
      timeRangeMs={stepDefineState.timeRangeMs}
      dslQuery={
        getCreateTransformRequestBody(dataView, stepDefineState, stepDetailsState).source.query
      }
    >
      <UrlStateProvider>
        <StorageContextProvider storage={localStorage} storageKeys={TRANSFORM_STORAGE_KEYS}>
          <DatePickerContextProvider {...datePickerDeps}>
            <EuiSteps className="transform__steps" steps={euiStepsConfig} />
          </DatePickerContextProvider>
        </StorageContextProvider>
      </UrlStateProvider>
    </FieldStatsFlyoutProvider>
  );
});
