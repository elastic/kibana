/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC, useRef, useState, createContext, useMemo } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiSteps, EuiStepStatus } from '@elastic/eui';

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
import { IndexPattern } from '../../../../../../../../../src/plugins/data/public';
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
    <Fragment>
      <div ref={definePivotRef} />
      {isCurrentStep && (
        <Fragment>
          <StepDefineForm
            onChange={setStepDefineState}
            overrides={{ ...stepDefineState }}
            searchItems={searchItems}
          />
          <WizardNav
            next={() => setCurrentStep(WIZARD_STEPS.DETAILS)}
            nextActive={stepDefineState.valid}
          />
        </Fragment>
      )}
      {!isCurrentStep && (
        <StepDefineSummary formState={{ ...stepDefineState }} searchItems={searchItems} />
      )}
    </Fragment>
  );
};

interface WizardProps {
  cloneConfig?: TransformConfigUnion;
  searchItems: SearchItems;
}

export const CreateTransformWizardContext = createContext<{
  indexPattern: IndexPattern | null;
  runtimeMappings: RuntimeMappings | undefined;
}>({
  indexPattern: null,
  runtimeMappings: undefined,
});

export const Wizard: FC<WizardProps> = React.memo(({ cloneConfig, searchItems }) => {
  const { indexPattern } = searchItems;

  // The current WIZARD_STEP
  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.DEFINE);

  // The DEFINE state
  const [stepDefineState, setStepDefineState] = useState(
    applyTransformConfigToDefineState(
      getDefaultStepDefineState(searchItems),
      cloneConfig,
      indexPattern
    )
  );

  // The DETAILS state
  const [stepDetailsState, setStepDetailsState] = useState(
    applyTransformConfigToDetailsState(getDefaultStepDetailsState(), cloneConfig)
  );

  // The CREATE state
  const [stepCreateState, setStepCreateState] = useState(getDefaultStepCreateState);

  const transformConfig = getCreateTransformRequestBody(
    indexPattern.title,
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
        <Fragment>
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
        </Fragment>
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
        <Fragment>
          {currentStep === WIZARD_STEPS.CREATE ? (
            <StepCreateForm
              createIndexPattern={stepDetailsState.createIndexPattern}
              transformId={stepDetailsState.transformId}
              transformConfig={transformConfig}
              onChange={setStepCreateState}
              overrides={stepCreateState}
              timeFieldName={stepDetailsState.indexPatternTimeField}
            />
          ) : (
            <StepCreateSummary />
          )}
          {currentStep === WIZARD_STEPS.CREATE && !stepCreateState.created && (
            <WizardNav previous={() => setCurrentStep(WIZARD_STEPS.DETAILS)} />
          )}
        </Fragment>
      ),
      status: currentStep >= WIZARD_STEPS.CREATE ? undefined : ('incomplete' as EuiStepStatus),
    };
  }, [
    currentStep,
    setCurrentStep,
    stepDetailsState.createIndexPattern,
    stepDetailsState.transformId,
    transformConfig,
    setStepCreateState,
    stepCreateState,
    stepDetailsState.indexPatternTimeField,
  ]);

  const stepsConfig = [stepDefine, stepDetails, stepCreate];

  return (
    <CreateTransformWizardContext.Provider
      value={{ indexPattern, runtimeMappings: stepDefineState.runtimeMappings }}
    >
      <EuiSteps className="transform__steps" steps={stepsConfig} />
    </CreateTransformWizardContext.Provider>
  );
});
