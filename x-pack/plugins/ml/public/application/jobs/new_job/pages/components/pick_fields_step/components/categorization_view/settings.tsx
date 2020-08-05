/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { BucketSpan } from '../bucket_span';

interface Props {
  setIsValid: (proceed: boolean) => void;
}

export const CategorizationSettings: FC<Props> = ({ setIsValid }) => {
  return (
    <>
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <BucketSpan setIsValid={setIsValid} hideEstimateButton={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
