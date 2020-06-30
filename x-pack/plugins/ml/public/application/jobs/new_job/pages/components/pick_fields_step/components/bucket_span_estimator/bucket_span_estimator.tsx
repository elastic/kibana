/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect, useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton } from '@elastic/eui';
import { isAdvancedJobCreator } from '../../../../../common/job_creator';
import { JobCreatorContext } from '../../../job_creator_context';
import { MLCATEGORY } from '../../../../../../../../../common/constants/field_types';

import { useEstimateBucketSpan, ESTIMATE_STATUS } from './estimate_bucket_span';

interface Props {
  setEstimating(estimating: boolean): void;
}

export const BucketSpanEstimator: FC<Props> = ({ setEstimating }) => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const { status, estimateBucketSpan } = useEstimateBucketSpan();
  const [noDetectors, setNoDetectors] = useState(jobCreator.detectors.length === 0);
  const [isUsingMlCategory, setIsUsingMlCategory] = useState(checkIsUsingMlCategory());

  useEffect(() => {
    setEstimating(status === ESTIMATE_STATUS.RUNNING);
  }, [status]);

  useEffect(() => {
    setNoDetectors(jobCreator.detectors.length === 0);
    setIsUsingMlCategory(checkIsUsingMlCategory());
  }, [jobCreatorUpdate]);

  function checkIsUsingMlCategory() {
    return (
      isAdvancedJobCreator(jobCreator) &&
      jobCreator.detectors.some((d) => {
        if (
          d.partition_field_name === MLCATEGORY ||
          d.over_field_name === MLCATEGORY ||
          d.by_field_name === MLCATEGORY
        ) {
          return true;
        }
      })
    );
  }

  return (
    <EuiButton
      disabled={
        status === ESTIMATE_STATUS.RUNNING || noDetectors === true || isUsingMlCategory === true
      }
      onClick={estimateBucketSpan}
    >
      <FormattedMessage
        id="xpack.ml.newJob.wizard.pickFieldsStep.bucketSpanEstimatorButton"
        defaultMessage="Estimate bucket span"
      />
    </EuiButton>
  );
};
