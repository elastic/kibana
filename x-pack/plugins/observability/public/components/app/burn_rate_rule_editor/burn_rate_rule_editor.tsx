/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import React from 'react';

import { LongTimeWindow } from './long_time_window';

export function BurnRateRuleEditor() {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiFormRow label="Select SLO" fullWidth>
            <EuiFieldText name="slo" fullWidth />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <LongTimeWindow />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Burn rate threshold" fullWidth>
            <EuiFieldText name="threshold" fullWidth />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
    </EuiFlexGroup>
  );
}
