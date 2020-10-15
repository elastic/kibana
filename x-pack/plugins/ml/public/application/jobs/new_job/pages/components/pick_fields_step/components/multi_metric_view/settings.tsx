/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { BucketSpan } from '../bucket_span';
import { SplitFieldSelector } from '../split_field';
import { Influencers } from '../influencers';
import { SparseDataSwitch } from '../sparse_data';

interface Props {
  setIsValid: (proceed: boolean) => void;
}

export const MultiMetricSettings: FC<Props> = ({ setIsValid }) => {
  return (
    <Fragment>
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <SplitFieldSelector />
        </EuiFlexItem>
        <EuiFlexItem>
          <Influencers />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <BucketSpan setIsValid={setIsValid} />
        </EuiFlexItem>
        <EuiFlexItem>
          <SparseDataSwitch />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
