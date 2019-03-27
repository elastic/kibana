/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useState } from 'react';

import { StaticIndexPattern } from 'ui/index_patterns';

import { EuiSteps, EuiStepStatus } from '@elastic/eui';

import { WizardNav } from '../../components/wizard_nav';

import {
  DefinePivotForm,
  DefinePivotSummary,
  getDefaultPivotState,
} from '../../components/define_pivot';

import {
  getDefaultJobCreateState,
  JobCreateForm,
  JobCreateSummary,
} from '../../components/job_create';

import {
  getDefaultJobDetailsState,
  JobDetailsForm,
  JobDetailsSummary,
} from '../../components/job_details';

const WIZARD_STEPS = {
  DEFINE_PIVOT: 0,
  JOB_DETAILS: 1,
  JOB_CREATE: 2,
};

interface Props {
  indexPattern: StaticIndexPattern;
}

export const Wizard: SFC<Props> = ({ indexPattern }) => {
  // The current WIZARD_STEP
  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.DEFINE_PIVOT);

  // The DEFINE_PIVOT state
  const [pivotState, setPivot] = useState(getDefaultPivotState());

  const pivot =
    currentStep === WIZARD_STEPS.DEFINE_PIVOT ? (
      <DefinePivotForm indexPattern={indexPattern} onChange={setPivot} overrides={pivotState} />
    ) : (
      <DefinePivotSummary indexPattern={indexPattern} {...pivotState} />
    );

  // The JOB_DETAILS state
  const [jobDetailsState, setJobDetails] = useState(getDefaultJobDetailsState());

  const jobDetails =
    currentStep === WIZARD_STEPS.JOB_DETAILS ? (
      <JobDetailsForm onChange={setJobDetails} override={jobDetailsState} />
    ) : (
      <JobDetailsSummary />
    );

  // The JOB_CREATE state
  const [jobCreateState, setJobCreate] = useState(getDefaultJobCreateState());

  const jobCreate =
    currentStep === WIZARD_STEPS.JOB_CREATE ? (
      <JobCreateForm onChange={setJobCreate} override={jobCreateState} />
    ) : (
      <JobCreateSummary />
    );

  const stepsConfig = [
    {
      title: 'Define pivot',
      children: (
        <Fragment>
          {pivot}
          {currentStep === WIZARD_STEPS.DEFINE_PIVOT && (
            <WizardNav
              next={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)}
              nextActive={pivotState.valid}
            />
          )}
        </Fragment>
      ),
    },
    {
      title: 'Job details',
      children: (
        <Fragment>
          {jobDetails}
          {currentStep === WIZARD_STEPS.JOB_DETAILS && (
            <WizardNav
              previous={() => setCurrentStep(WIZARD_STEPS.DEFINE_PIVOT)}
              next={() => setCurrentStep(WIZARD_STEPS.JOB_CREATE)}
              nextActive={jobDetailsState.valid}
            />
          )}
        </Fragment>
      ),
      status: currentStep >= WIZARD_STEPS.JOB_DETAILS ? undefined : ('incomplete' as EuiStepStatus),
    },
    {
      title: 'Create',
      children: (
        <Fragment>
          {jobCreate}
          {currentStep === WIZARD_STEPS.JOB_CREATE && (
            <WizardNav previous={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)} />
          )}
        </Fragment>
      ),
      status: currentStep >= WIZARD_STEPS.JOB_CREATE ? undefined : ('incomplete' as EuiStepStatus),
    },
  ];

  return <EuiSteps steps={stepsConfig} />;
};
