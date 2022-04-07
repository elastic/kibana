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
  compactView?: boolean;
}

export const StepImage = ({ step, compactView }: Props) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
      <EuiFlexItem grow={false}>
        <PingTimestamp
          checkGroup={step.monitor.check_group}
          initialStepNo={step.synthetics?.step?.index}
          stepStatus={step.synthetics.payload?.status}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minWidth: 80 }}>
        <EuiText size={compactView ? 's' : 'm'}>{step.synthetics?.step?.name}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
