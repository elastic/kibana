/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
// @ts-ignore
import { KueryBar } from '../KueryBar';
import { DatePicker } from './DatePicker';

export function FilterBar() {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <KueryBar />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DatePicker />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
