/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useRef, useState, createContext } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiSteps, EuiStepStatus } from '@elastic/eui';

import { getCreateRequestBody, TransformPivotConfig } from '../../../../common';
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

enum KBN_MANAGEMENT_PAGE_CLASSNAME {
  DEFAULT_BODY = 'mgtPage__body',
  TRANSFORM_BODY_MODIFIER = 'mgtPage__body--transformWizard',
}

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
  cloneConfig?: TransformPivotConfig;
  searchItems: SearchItems;
}

export const CreateTransformWizardContext = createContext<{ indexPattern: IndexPattern | null }>({
  indexPattern: null,
});

export const Wizard: FC<WizardProps> = React.memo(({ cloneConfig, searchItems }) => {
  const { indexPattern } = searchItems;

  // The current WIZARD_STEP
  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.DEFINE);

  // The DEFINE state
  const [stepDefineState, setStepDefineState] = useState(
    applyTransformConfigToDefineState(getDefaultStepDefineState(searchItems), cloneConfig)
  );

  // The DETAILS state
  const [stepDetailsState, setStepDetailsState] = useState(
    applyTransformConfigToDetailsState(getDefaultStepDetailsState(), cloneConfig)
  );

  const stepDetails =
    currentStep === WIZARD_STEPS.DETAILS ? (
      <StepDetailsForm
        onChange={setStepDetailsState}
        overrides={stepDetailsState}
        searchItems={searchItems}
        stepDefineState={stepDefineState}
      />
    ) : (
      <StepDetailsSummary {...stepDetailsState} />
    );

  // The CREATE state
  const [stepCreateState, setStepCreateState] = useState(getDefaultStepCreateState);

  useEffect(() => {
    // The transform plugin doesn't control the wrapping management page via React
    // so we use plain JS to add and remove a custom CSS class to set the full
    // page width to 100% for the transform wizard. It's done to replicate the layout
    // as it was when transforms were part of the ML plugin. This will be revisited
    // to come up with an approach that's more in line with the overall layout
    // of the Kibana management section.
    let managementBody = document.getElementsByClassName(
      KBN_MANAGEMENT_PAGE_CLASSNAME.DEFAULT_BODY
    );

    if (managementBody.length > 0) {
      managementBody[0].classList.replace(
        KBN_MANAGEMENT_PAGE_CLASSNAME.DEFAULT_BODY,
        KBN_MANAGEMENT_PAGE_CLASSNAME.TRANSFORM_BODY_MODIFIER
      );
      return () => {
        managementBody = document.getElementsByClassName(
          KBN_MANAGEMENT_PAGE_CLASSNAME.TRANSFORM_BODY_MODIFIER
        );
        managementBody[0].classList.replace(
          KBN_MANAGEMENT_PAGE_CLASSNAME.TRANSFORM_BODY_MODIFIER,
          KBN_MANAGEMENT_PAGE_CLASSNAME.DEFAULT_BODY
        );
      };
    }
  }, []);

  const transformConfig = getCreateRequestBody(
    indexPattern.title,
    stepDefineState,
    stepDetailsState
  );

  const stepCreate =
    currentStep === WIZARD_STEPS.CREATE ? (
      <StepCreateForm
        createIndexPattern={stepDetailsState.createIndexPattern}
        transformId={stepDetailsState.transformId}
        transformConfig={transformConfig}
        onChange={setStepCreateState}
        overrides={stepCreateState}
        timeFieldName={stepDetailsState.indexPatternDateField}
      />
    ) : (
      <StepCreateSummary />
    );

  const stepsConfig = [
    {
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
    },
    {
      title: i18n.translate('xpack.transform.transformsWizard.stepDetailsTitle', {
        defaultMessage: 'Transform details',
      }),
      children: (
        <Fragment>
          {stepDetails}
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
    },
    {
      title: i18n.translate('xpack.transform.transformsWizard.stepCreateTitle', {
        defaultMessage: 'Create',
      }),
      children: (
        <Fragment>
          {stepCreate}
          {currentStep === WIZARD_STEPS.CREATE && !stepCreateState.created && (
            <WizardNav previous={() => setCurrentStep(WIZARD_STEPS.DETAILS)} />
          )}
        </Fragment>
      ),
      status: currentStep >= WIZARD_STEPS.CREATE ? undefined : ('incomplete' as EuiStepStatus),
    },
  ];

  return (
    <CreateTransformWizardContext.Provider value={{ indexPattern }}>
      <EuiSteps className="transform__steps" steps={stepsConfig} />
    </CreateTransformWizardContext.Provider>
  );
});
