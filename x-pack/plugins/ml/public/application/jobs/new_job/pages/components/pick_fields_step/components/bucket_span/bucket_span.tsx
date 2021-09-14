/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { BucketSpanInput } from './bucket_span_input';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';
import { BucketSpanEstimator } from '../bucket_span_estimator';

interface Props {
  setIsValid: (proceed: boolean) => void;
  hideEstimateButton?: boolean;
}

export const BucketSpan: FC<Props> = ({ setIsValid, hideEstimateButton = false }) => {
  const {
    jobCreator,
    jobCreatorUpdate,
    jobCreatorUpdated,
    jobValidator,
    jobValidatorUpdated,
  } = useContext(JobCreatorContext);
  const [bucketSpan, setBucketSpan] = useState(jobCreator.bucketSpan);
  const [validation, setValidation] = useState(jobValidator.bucketSpan);
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    jobCreator.bucketSpan = bucketSpan;
    jobCreatorUpdate();
  }, [bucketSpan]);

  useEffect(() => {
    setBucketSpan(jobCreator.bucketSpan);
  }, [jobCreatorUpdated]);

  useEffect(() => {
    setValidation(jobValidator.bucketSpan);
  }, [jobValidatorUpdated]);

  useEffect(() => {
    setIsValid(estimating === false);
  }, [estimating]);

  return (
    <Description validation={validation}>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <BucketSpanInput
            setBucketSpan={setBucketSpan}
            bucketSpan={bucketSpan}
            isInvalid={validation.valid === false}
            disabled={estimating}
          />
        </EuiFlexItem>
        {hideEstimateButton === false && (
          <EuiFlexItem>
            <BucketSpanEstimator setEstimating={setEstimating} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </Description>
  );
};
