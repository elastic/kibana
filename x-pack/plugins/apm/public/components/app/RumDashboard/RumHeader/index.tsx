/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { DatePicker } from '../../../shared/DatePicker';

export const RumHeader: React.FC = ({ children }) => (
  <>
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem>{children}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DatePicker />
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
