/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useRef, useState, useEffect } from 'react';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormHelpText,
  EuiFormRow,
  EuiSpacer,
  EuiFieldNumber,
  EuiSelect,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiFieldText,
  EuiButton,
  EuiProgress,
} from '@elastic/eui';
import { WizardNav } from '../../../../../data_frame/components/wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { KibanaContext, isKibanaContext } from '../../../../../data_frame/common/kibana_context';

export const SummaryStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const { jobCreator, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const [progress, setProgress] = useState(0);

  function setProgressWrapper(p: number) {
    // console.log(p);
    setProgress(p);
  }

  useEffect(() => {
    // console.log('subscribing to progress');
    jobCreator.subscribeToProgress(setProgressWrapper);
  }, []);

  function start() {
    jobCreator.createAndStartJob();
  }

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <Fragment>
            {jobCreator.jobId}
            <br />
            {jobCreator.start} : {jobCreator.end}
            <br />
            {JSON.stringify(jobCreator.detectors, null, 2)}
            <br />
            {jobCreator.bucketSpan}
          </Fragment>
          <WizardNav previous={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)} />
          <EuiButton onClick={start}>Create job</EuiButton>
          {/* {progress > 0 && <EuiProgress value={progress} size="m" max={100} />} */}
          {progress === 100 && 'Job created'}
        </Fragment>
      )}
      {isCurrentStep === false && (
        <Fragment>
          {jobCreator.jobId}
          <br />
          {jobCreator.start} : {jobCreator.end}
          <br />
          {JSON.stringify(jobCreator.detectors, null, 2)}
          <br />
          {jobCreator.bucketSpan}
        </Fragment>
      )}
    </Fragment>
  );
};
