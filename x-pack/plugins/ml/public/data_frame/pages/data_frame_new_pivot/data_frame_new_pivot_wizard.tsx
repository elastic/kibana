/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useState } from 'react';

import { StaticIndexPattern } from 'ui/index_patterns';

import { EuiButton, EuiSteps, EuiStepStatus } from '@elastic/eui';

import { DataFrameNewPivotWizardCreatePivot } from './data_frame_new_pivot_wizard_create_pivot';

import { PivotState } from './common';

const DefinePivotBlur = () => <p>This is not the current step.</p>;

const JobDetails = () => <p>Job Details are the current step.</p>;
const JobDetailsBlur = () => <p>Job Details are not the current step.</p>;

const JobCreate = () => <p>Job Create is the current step.</p>;
const JobCreateBlur = () => <p>Job Create is not the current step.</p>;

const WIZARD_STEPS = {
  DEFINE_PIVOT: 'define_pivot',
  JOB_DETAILS: 'job_details',
  JOB_CREATE: 'job_create',
};

interface StepsNavProps {
  previousActive?: boolean;
  nextActive?: boolean;
  previous?(): void;
  next?(): void;
}

const StepsNav: SFC<StepsNavProps> = ({
  previous,
  previousActive = true,
  next,
  nextActive = true,
}) => (
  <Fragment>
    {previous && (
      <EuiButton disabled={!previousActive} onClick={previous} iconType="arrowLeft" size="s">
        Previous
      </EuiButton>
    )}
    {next && (
      <EuiButton disabled={!nextActive} onClick={next} iconType="arrowRight" size="s">
        Next
      </EuiButton>
    )}
  </Fragment>
);

interface Props {
  indexPattern: StaticIndexPattern;
  configHandler(s: PivotState): void;
}

export const DataFrameNewPivotWizard: SFC<Props> = ({ indexPattern }) => {
  const [step, setStep] = useState(WIZARD_STEPS.DEFINE_PIVOT);
  const [pivotValid, setPivotValid] = useState(false);

  function definePivotHandler(config: PivotState) {
    setPivotValid(config.groupBy.length > 0 && config.aggList.length > 0);
  }

  const pivot =
    step === WIZARD_STEPS.DEFINE_PIVOT ? (
      <DataFrameNewPivotWizardCreatePivot
        indexPattern={indexPattern}
        configHandler={definePivotHandler}
      />
    ) : (
      <DefinePivotBlur />
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
            <StepsNav next={() => setStep(WIZARD_STEPS.JOB_DETAILS)} nextActive={pivotValid} />
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
            <StepsNav
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
            <StepsNav previous={() => setStep(WIZARD_STEPS.JOB_DETAILS)} />
          )}
        </Fragment>
      ),
      status: 'incomplete' as EuiStepStatus,
    },
  ];

  return <EuiSteps steps={stepsConfig} />;
};
