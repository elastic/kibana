/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useRef, useEffect, useState } from 'react';
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
} from '@elastic/eui';
import { WizardNav } from '../../../../../data_frame/components/wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { KibanaContext, isKibanaContext } from '../../../../../data_frame/common/kibana_context';

export const JobDetailsStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const { jobCreator, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);

  const [jobId, setJobId] = useState(jobCreator.jobId);

  // const [start, setStart] = useState(jobCreator.start);
  // const [end, setEnd] = useState(jobCreator.end);
  // const [detectors, setDetectors] = useState(jobCreator.detectors);

  // useEffect(
  //   () => {
  //     setStart(jobCreator.start);
  //     setEnd(jobCreator.end);
  //     setDetectors(jobCreator.detectors);
  //     console.log(jobCreator);
  //   },
  //   [jobCreatorUpdated]
  // );
  useEffect(
    () => {
      jobCreator.jobId = jobId;
      jobCreatorUpdate();
    },
    [jobId]
  );

  function nextActive(): boolean {
    return jobId !== '';
  }

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <EuiFieldText
            placeholder="Job ID"
            value={jobId}
            onChange={e => setJobId(e.target.value)}
          />
          <WizardNav
            previous={() => setCurrentStep(WIZARD_STEPS.PICK_FIELDS)}
            next={() => setCurrentStep(WIZARD_STEPS.SUMMARY)}
            nextActive={nextActive()}
          />
        </Fragment>
      )}
    </Fragment>
  );
};
