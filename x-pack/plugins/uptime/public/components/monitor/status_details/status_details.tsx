/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import { LocationAvailability } from './location_availability/location_availability';
import { UptimeRefreshContext } from '../../../contexts';
import { MonitorLocations } from '../../../../common/runtime_types';
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
  const { refreshApp } = useContext(UptimeRefreshContext);

  const [isTabActive] = useState(document.visibilityState);
  const onTabActive = () => {
    if (document.visibilityState === 'visible' && isTabActive === 'hidden') {
      refreshApp();
    }
  };

  // Refreshing application state after Tab becomes active to render latest map state
  // If application renders in when tab is not in focus it gives some unexpected behaviors
  // Where map is not visible on change
  useEffect(() => {
    document.addEventListener('visibilitychange', onTabActive);
    return () => {
      document.removeEventListener('visibilitychange', onTabActive);
    };

    // we want this effect to execute exactly once after the component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiPanel>
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
