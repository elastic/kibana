/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiErrorBoundary, EuiTitle } from '@elastic/eui';
import { LocationStatusTags } from '../availability_reporting';
import { LocationPoint } from '../location_map/embeddables/embedded_map';
import { MonitorLocations, MonitorLocation } from '../../../../../common/runtime_types';
import { UNNAMED_LOCATION } from '../../../../../common/constants';
import { LocationMissingWarning } from '../location_map/location_missing';
import { useSelectedView } from './use_selected_view';
import { LocationMap } from '../location_map';
import { MonitoringFrom } from '../translations';
import { ToggleViewBtn } from './toggle_view_btn';

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
  const upPoints: LocationPoint[] = [];
  const downPoints: LocationPoint[] = [];

  let isAnyGeoInfoMissing = false;

  if (monitorLocations?.locations) {
    monitorLocations.locations.forEach(({ geo, summary }: MonitorLocation) => {
      if (geo?.name === UNNAMED_LOCATION || !geo?.location) {
        isAnyGeoInfoMissing = true;
      } else if (!!geo.location.lat && !!geo.location.lon) {
        if (summary?.down === 0) {
          upPoints.push(geo as LocationPoint);
        } else {
          downPoints.push(geo as LocationPoint);
        }
      }
    });
  }
  const { selectedView: initialView } = useSelectedView();

  const [selectedView, setSelectedView] = useState(initialView);

  return (
    <EuiErrorBoundary>
      <EuiFlexGroup responsive={false} gutterSize={'none'} style={{ flexGrow: 0 }}>
        {selectedView === 'list' && (
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>{MonitoringFrom}</h3>
            </EuiTitle>
          </EuiFlexItem>
        )}
        {selectedView === 'map' && (
          <EuiFlexItem>{isAnyGeoInfoMissing && <LocationMissingWarning />}</EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <ToggleViewBtn
            onChange={(val) => {
              setSelectedView(val);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup wrap={true} gutterSize="none" justifyContent="flexEnd">
        {selectedView === 'list' && (
          <EuiFlexItemTags grow={true}>
            <LocationStatusTags locations={monitorLocations?.locations || []} />
          </EuiFlexItemTags>
        )}
        {selectedView === 'map' && (
          <EuiFlexItem grow={false}>
            <LocationMap upPoints={upPoints} downPoints={downPoints} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiErrorBoundary>
  );
};
