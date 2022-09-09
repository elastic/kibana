/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useContext, useEffect, useMemo } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';

export const JobIdInput: FC = () => {
  const { jobCreator, jobCreatorUpdate, jobValidator, jobValidatorUpdated } =
    useContext(JobCreatorContext);
  const [jobId, setJobId] = useState(jobCreator.jobId);

  const validation = useMemo(() => {
    const isEmptyId = jobId === '';
    const valid =
      isEmptyId === true ||
      (jobValidator.jobId.valid === true &&
        jobValidator.latestValidationResult.jobIdExists?.valid === true);

    const message =
      jobValidator.jobId.message ?? jobValidator.latestValidationResult.jobIdExists?.message;

    return {
      valid,
      message,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobValidatorUpdated]);

  useEffect(() => {
    jobCreator.jobId = jobId;
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  return (
    <Description validation={validation}>
      <EuiFieldText
        value={jobId}
        onChange={(e) => setJobId(e.target.value)}
        isInvalid={validation.valid === false}
        data-test-subj="mlJobWizardInputJobId"
      />
    </Description>
  );
};
