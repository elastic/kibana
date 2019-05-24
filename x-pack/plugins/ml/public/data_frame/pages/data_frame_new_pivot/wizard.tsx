/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useContext, useRef, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiSteps, EuiStepStatus } from '@elastic/eui';

import { WizardNav } from '../../components/wizard_nav';

import {
  DefinePivotExposedState,
  DefinePivotForm,
  DefinePivotSummary,
  getDefaultPivotState,
} from '../../components/define_pivot';

import {
  getDefaultJobCreateState,
  JobCreateForm,
  JobCreateSummary,
} from '../../components/job_create';

import { getDataFrameRequest } from '../../common';
import {
  getDefaultJobDetailsState,
  JobDetailsForm,
  JobDetailsSummary,
} from '../../components/job_details';

import { isKibanaContext, KibanaContext } from '../../common';

enum WIZARD_STEPS {
  DEFINE_PIVOT,
  JOB_DETAILS,
  JOB_CREATE,
}

interface DefinePivotStepProps {
  isCurrentStep: boolean;
  pivotState: DefinePivotExposedState;
  setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
  setPivot: React.Dispatch<React.SetStateAction<DefinePivotExposedState>>;
}

const DefinePivotStep: SFC<DefinePivotStepProps> = ({
  isCurrentStep,
  pivotState,
  setCurrentStep,
  setPivot,
}) => {
  const definePivotRef = useRef(null);

  return (
    <Fragment>
      <div ref={definePivotRef} />
      {isCurrentStep && (
        <Fragment>
          <DefinePivotForm onChange={setPivot} overrides={pivotState} />
          <WizardNav
            next={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)}
            nextActive={pivotState.valid}
          />
        </Fragment>
      )}
      {!isCurrentStep && <DefinePivotSummary {...pivotState} />}
    </Fragment>
  );
};

export const Wizard: SFC = React.memo(() => {
  const kibanaContext = useContext(KibanaContext);

  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const indexPattern = kibanaContext.currentIndexPattern;

  // The current WIZARD_STEP
  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.DEFINE_PIVOT);

  // The DEFINE_PIVOT state
  const [pivotState, setPivot] = useState(getDefaultPivotState(kibanaContext));

  // The JOB_DETAILS state
  const [jobDetailsState, setJobDetails] = useState(getDefaultJobDetailsState());

  const jobDetails =
    currentStep === WIZARD_STEPS.JOB_DETAILS ? (
      <JobDetailsForm onChange={setJobDetails} overrides={jobDetailsState} />
    ) : (
      <JobDetailsSummary {...jobDetailsState} />
    );

  // The JOB_CREATE state
  const [jobCreateState, setJobCreate] = useState(getDefaultJobCreateState);

  const jobCreate =
    currentStep === WIZARD_STEPS.JOB_CREATE ? (
      <JobCreateForm
        createIndexPattern={jobDetailsState.createIndexPattern}
        jobId={jobDetailsState.jobId}
        jobConfig={getDataFrameRequest(indexPattern.title, pivotState, jobDetailsState)}
        onChange={setJobCreate}
        overrides={jobCreateState}
      />
    ) : (
      <JobCreateSummary />
    );

  // scroll to the currently selected wizard step
  /*
  function scrollToRef() {
    if (definePivotRef !== null && definePivotRef.current !== null) {
      // TODO Fix types
      const dummy = definePivotRef as any;
      const headerOffset = 70;
      window.scrollTo(0, dummy.current.offsetTop - headerOffset);
    }
  }
  */

  const stepsConfig = [
    {
      title: i18n.translate('xpack.ml.dataframe.transformsWizard.definePivotStepTitle', {
        defaultMessage: 'Define pivot',
      }),
      children: (
        <DefinePivotStep
          isCurrentStep={currentStep === WIZARD_STEPS.DEFINE_PIVOT}
          pivotState={pivotState}
          setCurrentStep={setCurrentStep}
          setPivot={setPivot}
        />
      ),
    },
    {
      title: i18n.translate('xpack.ml.dataframe.transformsWizard.jobDetailsStepTitle', {
        defaultMessage: 'Job details',
      }),
      children: (
        <Fragment>
          {jobDetails}
          {currentStep === WIZARD_STEPS.JOB_DETAILS && (
            <WizardNav
              previous={() => {
                setCurrentStep(WIZARD_STEPS.DEFINE_PIVOT);
                // scrollToRef();
              }}
              next={() => setCurrentStep(WIZARD_STEPS.JOB_CREATE)}
              nextActive={jobDetailsState.valid}
            />
          )}
        </Fragment>
      ),
      status: currentStep >= WIZARD_STEPS.JOB_DETAILS ? undefined : ('incomplete' as EuiStepStatus),
    },
    {
      title: i18n.translate('xpack.ml.dataframe.transformsWizard.createStepTitle', {
        defaultMessage: 'Create',
      }),
      children: (
        <Fragment>
          {jobCreate}
          {currentStep === WIZARD_STEPS.JOB_CREATE && !jobCreateState.created && (
            <WizardNav previous={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)} />
          )}
        </Fragment>
      ),
      status: currentStep >= WIZARD_STEPS.JOB_CREATE ? undefined : ('incomplete' as EuiStepStatus),
    },
  ];

  return <EuiSteps steps={stepsConfig} />;
});
