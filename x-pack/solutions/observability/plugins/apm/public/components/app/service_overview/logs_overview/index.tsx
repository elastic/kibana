/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { chartHeight } from '..';
import { LogRateChart } from '../../../shared/charts/log_rates/log_rate_chart';
import { LogErrorRateChart } from '../../../shared/charts/log_rates/log_error_rate_chart';

export function LogsOverview() {
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={4}>
        <LogRateChart height={chartHeight} />
      </EuiFlexItem>
      <EuiFlexItem grow={4}>
        <LogErrorRateChart height={chartHeight} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
