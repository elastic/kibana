/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiErrorBoundary,
  EuiHideFor,
  EuiButtonGroup,
  EuiShowFor,
} from '@elastic/eui';
import { LocationStatusTags } from '../status_details/availability_reporting';
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
  width: 350px;
  margin-top: auto;
  @media (max-width: 1042px) {
    width: 100%;
  }
`;

const FlexGroup = styled(EuiFlexGroup)`
  @media (max-width: 850px) {
  }
`;

const ToggleViewButtons = styled.span`
  margin-left: auto;
`;

interface LocationMapProps {
  monitorLocations: MonitorLocations;
}

export const LocationMap = ({ monitorLocations }: LocationMapProps) => {
  const upPoints: LocationPoint[] = [];
  const downPoints: LocationPoint[] = [];

  let isGeoInfoMissing = false;

  if (monitorLocations?.locations) {
    monitorLocations.locations.forEach(({ geo, summary }: MonitorLocation) => {
      if (geo?.name === UNNAMED_LOCATION || !geo?.location) {
        isGeoInfoMissing = true;
      } else if (!!geo.location.lat && !!geo.location.lon) {
        if (summary?.down === 0) {
          upPoints.push(geo);
        } else {
          downPoints.push(geo);
        }
      }
    });
  }

  const toggleButtons = [
    {
      id: `listBtn`,
      label: 'Bold',
      name: 'bold',
      iconType: 'list',
    },
    {
      id: `mapBtn`,
      label: 'Italic',
      name: 'italic',
      iconType: 'mapMarker',
    },
  ];

  const [selectedView, setSelectedView] = useState({ listBtn: true });

  const onChangeView = (optionId) => {
    setSelectedView({
      [optionId]: !selectedView[optionId],
    });
  };

  return (
    <EuiErrorBoundary>
      <EuiHideFor sizes={['xl']}>
        <ToggleViewButtons>
          <EuiButtonGroup
            options={toggleButtons}
            idToSelectedMap={selectedView}
            onChange={(id) => onChangeView(id)}
            type="multi"
            isIconOnly
            style={{ marginLeft: 'auto' }}
          />
        </ToggleViewButtons>
      </EuiHideFor>

      <FlexGroup wrap={true} gutterSize="none" justifyContent="flexEnd">
        <EuiShowFor sizes={!selectedView.listBtn ? ['xl'] : []}>
          <EuiFlexItemTags grow={true}>
            <LocationStatusTags
              locations={monitorLocations?.locations || []}
              ups={monitorLocations?.ups ?? 0}
              downs={monitorLocations?.downs ?? 0}
            />
          </EuiFlexItemTags>
        </EuiShowFor>
        <EuiShowFor sizes={!selectedView.mapBtn ? ['xl'] : []}>
          <EuiFlexItem grow={false}>
            {isGeoInfoMissing && <LocationMissingWarning />}
            <MapPanel>
              <EmbeddedMap
                upPoints={upPoints}
                downPoints={downPoints}
                monitorLocations={monitorLocations}
              />
            </MapPanel>
          </EuiFlexItem>
        </EuiShowFor>
      </FlexGroup>
    </EuiErrorBoundary>
  );
};
