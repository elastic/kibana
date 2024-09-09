/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { WizardNav } from '../wizard_nav';
import type { StepProps } from '../step_types';
import { WIZARD_STEPS } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { ValidateJob } from '../../../../../components/validate_job';
import { JOB_TYPE } from '../../../../../../../common/constants/new_job';
import { SkipValidationButton } from './skip_validatoin';

const idFilterList = [
  'job_id_valid',
  'job_group_id_valid',
  'detectors_function_not_empty',
  'success_bucket_span',
];

export const ValidationStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobCreator, jobCreatorUpdate, jobValidator } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);

  if (jobCreator.type === JOB_TYPE.ADVANCED) {
    // for advanced jobs, ignore time range warning as the
    // user hasn't selected a time range.
    idFilterList.push(...['time_range_short', 'success_time_range']);
  }

  function getJobConfig() {
    return {
      ...jobCreator.jobConfig,
      datafeed_config: jobCreator.datafeedConfig,
    };
  }

  function getDuration() {
    return {
      start: jobCreator.start,
      end: jobCreator.end,
    };
  }

  useEffect(() => {
    // force basic validation to run
    jobValidator.validate(() => {}, true);
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep a record of the advanced validation in the jobValidator
  function setIsValid(valid: boolean) {
    jobValidator.advancedValid = valid;
    setNextActive(valid);
  }

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <ValidateJob
            getJobConfig={getJobConfig}
            getDuration={getDuration}
            embedded={true}
            setIsValid={setIsValid}
            idFilterList={idFilterList}
          />
          <WizardNav
            previous={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)}
            next={() => setCurrentStep(WIZARD_STEPS.SUMMARY)}
            nextActive={nextActive}
          >
            <SkipValidationButton nextActive={nextActive} setCurrentStep={setCurrentStep} />
          </WizardNav>
        </Fragment>
      )}
      {isCurrentStep === false && <Fragment />}
    </Fragment>
  );
};
