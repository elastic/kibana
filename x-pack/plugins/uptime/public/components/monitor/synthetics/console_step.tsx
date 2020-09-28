/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import React, { useContext, FC } from 'react';
import { Ping } from '../../../../common/runtime_types';
import { UptimeThemeContext } from '../../../contexts';

interface ConsoleStepProps {
  step: Ping;
}

export const ConsoleStep: FC<ConsoleStepProps> = ({ step }) => {
  const {
    colors: { danger },
  } = useContext(UptimeThemeContext);

  let typeColor: string | null;
  if (step.synthetics?.type === 'stderr') {
    typeColor = danger;
  } else {
    typeColor = null;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>{step.timestamp}</EuiFlexItem>
      <EuiFlexItem grow={false} style={{ color: typeColor }}>
        {step.synthetics?.type}
      </EuiFlexItem>
      <EuiFlexItem>{step.synthetics?.payload?.message}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
