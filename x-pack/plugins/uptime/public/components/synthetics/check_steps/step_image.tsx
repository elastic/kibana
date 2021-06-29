/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { JourneyStep } from '../../../../common/runtime_types/ping/synthetics';
import { PingTimestamp } from '../../monitor/ping_list/columns/ping_timestamp';

interface Props {
  step: JourneyStep;
}

export const StepImage = ({ step }: Props) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <PingTimestamp
          checkGroup={step.monitor.check_group}
          initialStepNo={step.synthetics?.step?.index}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText>{step.synthetics?.step?.name}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
