/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiText } from '@elastic/eui';

export const ProgressBar: FC<{ progress: number }> = ({ progress }) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs">
    <EuiFlexItem style={{ width: '100px' }} grow={false}>
      <EuiProgress value={progress} max={100} color="primary" size="m">
        {progress}%
      </EuiProgress>
    </EuiFlexItem>
    <EuiFlexItem style={{ width: '35px' }} grow={false}>
      <EuiText size="xs">{`${progress}%`}</EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
