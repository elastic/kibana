/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { getNewJobDefaults } from '../../../../../../services/ml_server_info';
import { JobCreatorContext } from '../../job_creator_context';
import { Description } from './description';

export const ModelMemoryLimitInput: FC = () => {
  const {
    jobCreator,
    jobCreatorUpdate,
    jobCreatorUpdated,
    jobValidator,
    jobValidatorUpdated,
  } = useContext(JobCreatorContext);
  const [validation, setValidation] = useState(jobValidator.modelMemoryLimit);
  const [modelMemoryLimit, setModelMemoryLimit] = useState(
    jobCreator.modelMemoryLimit === null ? '' : jobCreator.modelMemoryLimit
  );

  const { anomaly_detectors: anomalyDetectors } = getNewJobDefaults();
  const { model_memory_limit: modelMemoryLimitDefault } = anomalyDetectors;

  useEffect(() => {
    jobCreator.modelMemoryLimit = modelMemoryLimit === '' ? null : modelMemoryLimit;
    jobCreatorUpdate();
  }, [modelMemoryLimit]);

  useEffect(() => {
    setModelMemoryLimit(jobCreator.modelMemoryLimit === null ? '' : jobCreator.modelMemoryLimit);
  }, [jobCreatorUpdated]);

  useEffect(() => {
    setValidation(jobValidator.modelMemoryLimit);
  }, [jobValidatorUpdated]);

  return (
    <Description validation={validation}>
      <EuiFieldText
        value={modelMemoryLimit}
        placeholder={modelMemoryLimitDefault}
        onChange={(e) => setModelMemoryLimit(e.target.value)}
        isInvalid={validation.valid === false}
        data-test-subj="mlJobWizardInputModelMemoryLimit"
      />
    </Description>
  );
};
