/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useRef, useState, createContext, useMemo } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiSteps, EuiStepStatus } from '@elastic/eui';

import { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { useAppDependencies } from '../../../../app_dependencies';
import type { TransformConfigUnion } from '../../../../../../common/types/transform';

import { getCreateTransformRequestBody } from '../../../../common';
import { SearchItems } from '../../../../hooks/use_search_items';

import {
  applyTransformConfigToDefineState,
  getDefaultStepDefineState,
  StepDefineExposedState,
  StepDefineForm,
  StepDefineSummary,
} from '../step_define';
import { getDefaultStepCreateState, StepCreateForm, StepCreateSummary } from '../step_create';
import {
  applyTransformConfigToDetailsState,
  getDefaultStepDetailsState,
  StepDetailsForm,
  StepDetailsSummary,
} from '../step_details';
import { WizardNav } from '../wizard_nav';
import type { RuntimeMappings } from '../step_define/common/types';

enum WIZARD_STEPS {
  DEFINE,
  DETAILS,
  CREATE,
}

interface DefinePivotStepProps {
  isCurrentStep: boolean;
  stepDefineState: StepDefineExposedState;
  setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
  setStepDefineState: React.Dispatch<React.SetStateAction<StepDefineExposedState>>;
  searchItems: SearchItems;
}

const StepDefine: FC<DefinePivotStepProps> = ({
  isCurrentStep,
  stepDefineState,
  setCurrentStep,
  setStepDefineState,
  searchItems,
}) => {
  const definePivotRef = useRef(null);

  return (
    <>
      <div ref={definePivotRef} />
      {isCurrentStep && (
        <>
          <StepDefineForm
            onChange={setStepDefineState}
            overrides={{ ...stepDefineState }}
            searchItems={searchItems}
          />
          <WizardNav
            next={() => setCurrentStep(WIZARD_STEPS.DETAILS)}
            nextActive={stepDefineState.valid}
          />
        </>
      )}
      {!isCurrentStep && (
        <StepDefineSummary formState={{ ...stepDefineState }} searchItems={searchItems} />
      )}
    </>
  );
};

interface WizardProps {
  cloneConfig?: TransformConfigUnion;
  searchItems: SearchItems;
}

export const CreateTransformWizardContext = createContext<{
  dataView: DataView | null;
  runtimeMappings: RuntimeMappings | undefined;
}>({
  dataView: null,
  runtimeMappings: undefined,
});

export const Wizard: FC<WizardProps> = React.memo(({ cloneConfig, searchItems }) => {
  const {
    ml: { FieldStatsFlyoutProvider },
    uiSettings,
    dataViews,
    data,
    charts,
    fieldFormats,
  } = useAppDependencies();

  const fieldStatsServices: {
    uiSettings: IUiSettingsClient;
    dataViews: DataViewsContract;
    data: DataPublicPluginStart;
    fieldFormats: FieldFormatsStart;
    charts: ChartsPluginSetup;
  } = { uiSettings, dataViews, data, charts, fieldFormats };

  const { dataView } = searchItems;

  // The current WIZARD_STEP
  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.DEFINE);

  // The DEFINE state
  const [stepDefineState, setStepDefineState] = useState(
    applyTransformConfigToDefineState(getDefaultStepDefineState(searchItems), cloneConfig, dataView)
  );

  // The DETAILS state
  const [stepDetailsState, setStepDetailsState] = useState(
    applyTransformConfigToDetailsState(getDefaultStepDetailsState(), cloneConfig)
  );

  // The CREATE state
  const [stepCreateState, setStepCreateState] = useState(getDefaultStepCreateState);

  const transformConfig = getCreateTransformRequestBody(
    dataView.getIndexPattern(),
    stepDefineState,
    stepDetailsState
  );

  const stepDefine = useMemo(() => {
    return {
      title: i18n.translate('xpack.transform.transformsWizard.stepConfigurationTitle', {
        defaultMessage: 'Configuration',
      }),
      children: (
        <StepDefine
          isCurrentStep={currentStep === WIZARD_STEPS.DEFINE}
          stepDefineState={stepDefineState}
          setCurrentStep={setCurrentStep}
          setStepDefineState={setStepDefineState}
          searchItems={searchItems}
        />
      ),
    };
  }, [currentStep, stepDefineState, setCurrentStep, setStepDefineState, searchItems]);

  const stepDetails = useMemo(() => {
    return {
      title: i18n.translate('xpack.transform.transformsWizard.stepDetailsTitle', {
        defaultMessage: 'Transform details',
      }),
      children: (
        <>
          {currentStep === WIZARD_STEPS.DETAILS ? (
            <StepDetailsForm
              onChange={setStepDetailsState}
              overrides={stepDetailsState}
              searchItems={searchItems}
              stepDefineState={stepDefineState}
            />
          ) : (
            <StepDetailsSummary {...stepDetailsState} />
          )}
          {currentStep === WIZARD_STEPS.DETAILS && (
            <WizardNav
              previous={() => {
                setCurrentStep(WIZARD_STEPS.DEFINE);
              }}
              next={() => setCurrentStep(WIZARD_STEPS.CREATE)}
              nextActive={stepDetailsState.valid}
            />
          )}
        </>
      ),
      status: currentStep >= WIZARD_STEPS.DETAILS ? undefined : ('incomplete' as EuiStepStatus),
    };
  }, [currentStep, setStepDetailsState, stepDetailsState, searchItems, stepDefineState]);

  const stepCreate = useMemo(() => {
    return {
      title: i18n.translate('xpack.transform.transformsWizard.stepCreateTitle', {
        defaultMessage: 'Create',
      }),
      children: (
        <>
          {currentStep === WIZARD_STEPS.CREATE ? (
            <StepCreateForm
              createDataView={stepDetailsState.createDataView}
              transformId={stepDetailsState.transformId}
              transformConfig={transformConfig}
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
    currentStep,
    setCurrentStep,
    stepDetailsState.createDataView,
    stepDetailsState.transformId,
    transformConfig,
    setStepCreateState,
    stepCreateState,
    stepDetailsState.dataViewTimeField,
  ]);

  const stepsConfig = [stepDefine, stepDetails, stepCreate];

  return (
    <FieldStatsFlyoutProvider dataView={dataView} fieldStatsServices={fieldStatsServices}>
      <CreateTransformWizardContext.Provider
        value={{ dataView, runtimeMappings: stepDefineState.runtimeMappings }}
      >
        <EuiSteps className="transform__steps" steps={stepsConfig} />
      </CreateTransformWizardContext.Provider>
    </FieldStatsFlyoutProvider>
  );
});
