/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Ping } from '../../../../common/runtime_types/ping';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { PingTimestamp } from '../../monitor/ping_list/columns/ping_timestamp';

interface Props {
  step: Ping;
}
export const StepImage = ({ step }: Props) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <PingTimestamp ping={step} showNavBtn={false} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText>{step.synthetics?.step?.name}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
