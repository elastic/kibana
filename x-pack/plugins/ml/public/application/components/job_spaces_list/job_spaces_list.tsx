/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';

interface Props {
  spaces: string[];
}

export const JobSpacesList: FC<Props> = ({ spaces }) => (
  <EuiFlexGroup wrap responsive={false} gutterSize="xs">
    {spaces.map((space) => (
      <EuiFlexItem grow={false} key={space}>
        <EuiBadge color={'hollow'}>{space}</EuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
