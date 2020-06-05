/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiErrorBoundary,
  EuiButtonGroup,
  EuiTitle,
} from '@elastic/eui';
import { LocationStatusTags } from '../availability_reporting';
import { EmbeddedMap, LocationPoint } from './embeddables/embedded_map';
import { MonitorLocations, MonitorLocation } from '../../../../../common/runtime_types';
import { UNNAMED_LOCATION } from '../../../../../common/constants';
import { LocationMissingWarning } from './location_missing';
import { useSelectedView } from './use_selected_view';

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
  width: 350px;
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
          upPoints.push(geo as LocationPoint);
        } else {
          downPoints.push(geo as LocationPoint);
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
      'data-test-subj': 'uptimeMonitorToggleListBtn',
    },
    {
      id: `mapBtn`,
      label: 'Italic',
      name: 'italic',
      iconType: 'mapMarker',
      'data-test-subj': 'uptimeMonitorToggleMapBtn',
    },
  ];

  const { selectedView, setSelectedView } = useSelectedView();

  const onChangeView = (optionId: string) => {
    setSelectedView(optionId === 'listBtn' ? 'list' : 'map');
  };

  return (
    <EuiErrorBoundary>
      <EuiFlexGroup responsive={false} gutterSize={'none'} style={{ flexGrow: 0 }}>
        {selectedView === 'list' && (
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>Monitoring from</h3>
            </EuiTitle>
          </EuiFlexItem>
        )}
        {selectedView === 'map' && (
          <EuiFlexItem>{isGeoInfoMissing && <LocationMissingWarning />}</EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <ToggleViewButtons>
            <EuiButtonGroup
              options={toggleButtons}
              idToSelectedMap={{ listBtn: selectedView === 'list', mapBtn: selectedView === 'map' }}
              onChange={(id) => onChangeView(id)}
              type="multi"
              isIconOnly
              style={{ marginLeft: 'auto' }}
            />
          </ToggleViewButtons>
        </EuiFlexItem>
      </EuiFlexGroup>

      <FlexGroup wrap={true} gutterSize="none" justifyContent="flexEnd">
        {selectedView === 'list' && (
          <EuiFlexItemTags grow={true}>
            <LocationStatusTags locations={monitorLocations?.locations || []} />
          </EuiFlexItemTags>
        )}
        {selectedView === 'map' && (
          <EuiFlexItem grow={false}>
            <MapPanel>
              <EmbeddedMap upPoints={upPoints} downPoints={downPoints} />
            </MapPanel>
          </EuiFlexItem>
        )}
      </FlexGroup>
    </EuiErrorBoundary>
  );
};
