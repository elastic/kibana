/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

export const TimelinePhaseText: FunctionComponent<{
  phaseName: ReactNode | string;
  durationInPhase?: ReactNode | string;
}> = ({ phaseName, durationInPhase }) => (
  <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
    <EuiFlexItem>
      <EuiText size="s">
        <strong>{phaseName}</strong>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      {typeof durationInPhase === 'string' ? (
        <EuiText size="s">{durationInPhase}</EuiText>
      ) : (
        durationInPhase
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);
