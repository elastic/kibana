/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiErrorBoundary, EuiHideFor } from '@elastic/eui';
import { LocationStatusTags } from './location_status_tags';
import { EmbeddedMap, LocationPoint } from './embeddables/embedded_map';
import { MonitorLocations, MonitorLocation } from '../../../../common/runtime_types';
import { UNNAMED_LOCATION } from '../../../../common/constants';
import { LocationMissingWarning } from './location_missing';

// These height/width values are used to make sure map is in center of panel
// And to make sure, it doesn't take too much space
const MapPanel = styled.div`
  height: 240px;
  width: 520px;
  @media (min-width: 1300px) {
    margin-right: 20px;
  }
  @media (max-width: 574px) {
    height: 250px;
    width: 100%;
    margin-right: 0;
  }
`;

const EuiFlexItemTags = styled(EuiFlexItem)`
  padding-top: 5px;
  @media (max-width: 850px) {
    order: 1;
  }
`;

const FlexGroup = styled(EuiFlexGroup)`
  @media (max-width: 850px) {
    justify-content: center;
  }
`;

interface LocationMapProps {
  monitorLocations: MonitorLocations;
}

export const LocationMap = ({ monitorLocations }: LocationMapProps) => {
  const upPoints: LocationPoint[] = [];
  const downPoints: LocationPoint[] = [];

  let isGeoInfoMissing = false;

  if (monitorLocations?.locations) {
    monitorLocations.locations.forEach((item: MonitorLocation) => {
      if (item.geo?.name === UNNAMED_LOCATION || !item.geo?.location) {
        isGeoInfoMissing = true;
      } else if (
        item.geo?.name !== UNNAMED_LOCATION &&
        !!item.geo.location.lat &&
        !!item.geo.location.lon
      ) {
        // TypeScript doesn't infer that the above checks in this block's condition
        // ensure that lat and lon are defined when we try to pass the location object directly,
        // but if we destructure the values it does. Improvement to this block is welcome.
        const { lat, lon } = item.geo.location;
        if (item?.summary?.down === 0) {
          upPoints.push({ lat, lon });
        } else {
          downPoints.push({ lat, lon });
        }
      }
    });
  }

  return (
    <EuiErrorBoundary>
      <FlexGroup wrap={true} gutterSize="none">
        <EuiFlexItemTags>
          <LocationStatusTags locations={monitorLocations?.locations || []} />
        </EuiFlexItemTags>
        <EuiHideFor sizes={['xs']}>
          <EuiFlexItem grow={false}>
            {isGeoInfoMissing && <LocationMissingWarning />}
            <MapPanel>
              <EmbeddedMap upPoints={upPoints} downPoints={downPoints} />
            </MapPanel>
          </EuiFlexItem>
        </EuiHideFor>
      </FlexGroup>
    </EuiErrorBoundary>
  );
};
