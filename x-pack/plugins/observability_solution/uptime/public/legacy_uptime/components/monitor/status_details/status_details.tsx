/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { MonitorLocations } from '../../../../../common/runtime_types';
import { LocationAvailability } from './location_availability/location_availability';
import { MonitorStatusBar } from './status_bar';

interface MonitorStatusDetailsProps {
  monitorLocations: MonitorLocations;
}

const WrapFlexItem = styled(EuiFlexItem)`
  &&& {
    @media (max-width: 800px) {
      flex-basis: 100%;
    }
  }
`;

export const MonitorStatusDetailsComponent = ({ monitorLocations }: MonitorStatusDetailsProps) => {
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup gutterSize="l" wrap={true} responsive={true}>
        <EuiFlexItem grow={1}>
          <MonitorStatusBar />
        </EuiFlexItem>
        <WrapFlexItem grow={1}>
          <LocationAvailability monitorLocations={monitorLocations} />
        </WrapFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
