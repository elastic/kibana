/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect } from 'react';
import { WizardNav } from '../wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { ml } from '../../../../../services/ml_api_service';
import { ValidateJob } from '../../../../../components/validate_job';
import { JOB_TYPE } from '../../../../../../../common/constants/new_job';

const idFilterList = [
  'job_id_valid',
  'job_group_id_valid',
  'detectors_function_not_empty',
  'success_bucket_span',
];

export const ValidationStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobCreator, jobCreatorUpdate, jobValidator } = useContext(JobCreatorContext);

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
  }, []);

  // keep a record of the advanced validation in the jobValidator
  function setIsValid(valid: boolean) {
    jobValidator.advancedValid = valid;
  }

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <ValidateJob
            getJobConfig={getJobConfig}
            getDuration={getDuration}
            ml={ml}
            embedded={true}
            setIsValid={setIsValid}
            idFilterList={idFilterList}
          />
          <WizardNav
            previous={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)}
            next={() => setCurrentStep(WIZARD_STEPS.SUMMARY)}
            nextActive={true}
          />
        </Fragment>
      )}
      {isCurrentStep === false && <Fragment />}
    </Fragment>
  );
};
