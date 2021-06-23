/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiErrorBoundary, EuiTitle } from '@elastic/eui';
import { LocationStatusTags } from '../availability_reporting';
import { MonitorLocations } from '../../../../../common/runtime_types';
import { MonitoringFrom } from '../translations';

const EuiFlexItemTags = styled(EuiFlexItem)`
  width: 350px;
  @media (max-width: 1042px) {
    width: 100%;
  }
`;

interface LocationMapProps {
  monitorLocations: MonitorLocations;
}

export const LocationAvailability = ({ monitorLocations }: LocationMapProps) => {
  return (
    <EuiErrorBoundary>
      <EuiFlexGroup responsive={false} gutterSize={'none'} style={{ flexGrow: 0 }}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{MonitoringFrom}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup wrap={true} gutterSize="none" justifyContent="flexEnd">
        <EuiFlexItemTags grow={true}>
          <LocationStatusTags locations={monitorLocations?.locations || []} />
        </EuiFlexItemTags>
      </EuiFlexGroup>
    </EuiErrorBoundary>
  );
};
