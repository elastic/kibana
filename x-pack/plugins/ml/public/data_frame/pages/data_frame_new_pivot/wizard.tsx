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
  DefinePivotExposedState,
  DefinePivotForm,
  getDefaultPivotState,
} from './define_pivot_form';
import { DefinePivotSummary } from './define_pivot_summary';

const JobDetails = () => <p>Job Details are the current step.</p>;
const JobDetailsBlur = () => <p>Job Details are not the current step.</p>;

const JobCreate = () => <p>Job Create is the current step.</p>;
const JobCreateBlur = () => <p>Job Create is not the current step.</p>;

const WIZARD_STEPS = {
  DEFINE_PIVOT: 0,
  JOB_DETAILS: 1,
  JOB_CREATE: 2,
};

interface Props {
  indexPattern: StaticIndexPattern;
}

export const Wizard: SFC<Props> = ({ indexPattern }) => {
  const [step, setStep] = useState(WIZARD_STEPS.DEFINE_PIVOT);
  const [pivotState, setPivot] = useState(getDefaultPivotState());

  function definePivotHandler(config: DefinePivotExposedState) {
    setPivot(config);
  }

  const pivot =
    step === WIZARD_STEPS.DEFINE_PIVOT ? (
      <DefinePivotForm
        indexPattern={indexPattern}
        onChange={definePivotHandler}
        overrides={pivotState}
      />
    ) : (
      <DefinePivotSummary indexPattern={indexPattern} {...pivotState} />
    );
  const jobDetails = step === WIZARD_STEPS.JOB_DETAILS ? <JobDetails /> : <JobDetailsBlur />;
  const jobCreate = step === WIZARD_STEPS.JOB_CREATE ? <JobCreate /> : <JobCreateBlur />;

  const stepsConfig = [
    {
      title: 'Define pivot',
      children: (
        <Fragment>
          {pivot}
          {step === WIZARD_STEPS.DEFINE_PIVOT && (
            <WizardNav
              next={() => setStep(WIZARD_STEPS.JOB_DETAILS)}
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
          {step === WIZARD_STEPS.JOB_DETAILS && (
            <WizardNav
              previous={() => setStep(WIZARD_STEPS.DEFINE_PIVOT)}
              next={() => setStep(WIZARD_STEPS.JOB_CREATE)}
            />
          )}
        </Fragment>
      ),
      status: 'incomplete' as EuiStepStatus,
    },
    {
      title: 'Create',
      children: (
        <Fragment>
          {jobCreate}
          {step === WIZARD_STEPS.JOB_CREATE && (
            <WizardNav previous={() => setStep(WIZARD_STEPS.JOB_DETAILS)} />
          )}
        </Fragment>
      ),
      status: 'incomplete' as EuiStepStatus,
    },
  ];

  return <EuiSteps steps={stepsConfig} />;
};
