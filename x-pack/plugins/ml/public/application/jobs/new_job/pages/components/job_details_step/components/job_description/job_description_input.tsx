/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiTextArea } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';

export const JobDescriptionInput: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [jobDescription, setJobDescription] = useState(jobCreator.description);

  useEffect(() => {
    jobCreator.description = jobDescription;
    jobCreatorUpdate();
  }, [jobDescription]);

  return (
    <Description>
      <EuiTextArea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        data-test-subj="mlJobWizardInputJobDescription"
      />
    </Description>
  );
};
