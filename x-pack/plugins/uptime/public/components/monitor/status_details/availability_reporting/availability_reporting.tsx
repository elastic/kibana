/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';

const LastCheck = styled(EuiFlexItem)`
  white-space: nowrap;
`;

export const AvailabilityReporting: React.FC = () => {
  return (
    <>
      <EuiTitle size="s">
        <h3>99.99% Availability</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem style={{ flexBasis: '30%' }}>Location</EuiFlexItem>
        <EuiFlexItem>Availability</EuiFlexItem>
        <LastCheck>Last check</LastCheck>
      </EuiFlexGroup>
    </>
  );
};
