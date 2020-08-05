/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';
import { useStringifiedValue } from '../hooks';
import { DEFAULT_QUERY_DELAY } from '../../../../../../../../../common/constants/new_job';

export const QueryDelayInput: FC = () => {
  const { jobCreator, jobCreatorUpdate, jobValidator, jobValidatorUpdated } = useContext(
    JobCreatorContext
  );
  const [validation, setValidation] = useState(jobValidator.queryDelay);
  const { value: queryDelay, setValue: setQueryDelay } = useStringifiedValue(jobCreator.queryDelay);

  useEffect(() => {
    jobCreator.queryDelay = queryDelay === '' ? null : queryDelay;
    jobCreatorUpdate();
  }, [queryDelay]);

  useEffect(() => {
    setQueryDelay(jobCreator.queryDelay === null ? '' : jobCreator.queryDelay);
  }, [jobCreatorUpdate]);

  useEffect(() => {
    setValidation(jobValidator.queryDelay);
  }, [jobValidatorUpdated]);

  return (
    <Description validation={validation}>
      <EuiFieldText
        value={queryDelay}
        placeholder={DEFAULT_QUERY_DELAY}
        onChange={(e) => setQueryDelay(e.target.value)}
        isInvalid={validation.valid === false}
        data-test-subj="mlJobWizardInputQueryDelay"
      />
    </Description>
  );
};
