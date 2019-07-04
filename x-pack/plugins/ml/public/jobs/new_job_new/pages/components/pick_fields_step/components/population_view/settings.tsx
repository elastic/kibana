/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { BucketSpan } from '../bucket_span';
import { Influencers } from '../influencers';

interface Props {
  isActive: boolean;
  setIsValid: (proceed: boolean) => void;
}

export const PopulationSettings: FC<Props> = ({ isActive, setIsValid }) => {
  const { jobCreator, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const [bucketSpan, setBucketSpan] = useState(jobCreator.bucketSpan);

  useEffect(
    () => {
      jobCreator.bucketSpan = bucketSpan;
      jobCreatorUpdate();
      setIsValid(bucketSpan !== '');
    },
    [bucketSpan]
  );

  useEffect(
    () => {
      setBucketSpan(jobCreator.bucketSpan);
    },
    [jobCreatorUpdated]
  );

  return (
    <Fragment>
      {isActive && (
        <Fragment>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <BucketSpan />
            </EuiFlexItem>
            <EuiFlexItem>
              <Influencers />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      )}
    </Fragment>
  );
};
