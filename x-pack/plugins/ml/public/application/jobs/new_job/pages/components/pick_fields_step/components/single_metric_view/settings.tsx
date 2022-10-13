/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC, useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';

import { useNavigateToPath } from '../../../../../../../contexts/kibana';

import { convertToMultiMetricJob } from '../../../../../common/job_creator/util/general';

import { JobCreatorContext } from '../../../job_creator_context';

import { BucketSpan } from '../bucket_span';
import { SparseDataSwitch } from '../sparse_data';

interface Props {
  setIsValid: (proceed: boolean) => void;
}

export const SingleMetricSettings: FC<Props> = ({ setIsValid }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  const navigateToPath = useNavigateToPath();

  const convertToMultiMetric = () => {
    convertToMultiMetricJob(jobCreator, navigateToPath);
  };

  return (
    <Fragment>
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <BucketSpan setIsValid={setIsValid} />
        </EuiFlexItem>
        <EuiFlexItem>
          <SparseDataSwitch />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={convertToMultiMetric}>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.pickFieldsStep.singleMetricView.convertToMultiMetricButton"
              defaultMessage="Convert to multi-metric job"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
