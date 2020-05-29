/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React, { useContext } from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { EuiOutsideClickDetector, EuiPopoverTitle, EuiStat, EuiText } from '@elastic/eui';
import { TagLabel } from '../../status_details/availability_reporting';
import { UptimeThemeContext } from '../../../../contexts';
import { RenderTooltipContentParams } from '../../../../../../maps/public';
import { AppState } from '../../../../state';
import { monitorLocationsSelector } from '../../../../state/selectors';
import { useMonitorId } from '../../../../hooks';

type MapToolTipProps = Partial<RenderTooltipContentParams>;

const TimestampText = styled(EuiText)`
  display: inline-block;
  text-transform: initial;
  margin-left: 5px;
`;

export const MapToolTipComponent = ({
  closeTooltip,
  setFeatureIndex,
  features = [],
}: MapToolTipProps) => {
  const { id: locationName, layerId } = features[0] ?? {};
  const {
    colors: { gray, danger },
  } = useContext(UptimeThemeContext);

  const monitorId = useMonitorId();

  const monitorLocations = useSelector((state: AppState) =>
    monitorLocationsSelector(state, monitorId)
  );
  if (!locationName || !monitorLocations) {
    return null;
  }
  const { timestamp, ups, downs } = monitorLocations.locations.find(
    ({ geo }) => geo.name === locationName
  );

  const availability = (ups / (ups + downs)) * 100;

  return (
    <EuiOutsideClickDetector
      onOutsideClick={() => {
        if (closeTooltip != null) {
          closeTooltip();
          setFeatureIndex(0);
        }
      }}
    >
      <>
        <EuiPopoverTitle>
          {layerId === 'up_points' ? (
            <TagLabel item={{ label: locationName, color: gray }} />
          ) : (
            <TagLabel item={{ label: locationName, color: danger }} />
          )}
          <TimestampText color="subdued" size="s">
            {moment(timestamp).fromNow()}
          </TimestampText>
        </EuiPopoverTitle>
        <EuiStat
          title={availability.toFixed(2) + ' %'}
          description="Availability"
          textAlign="left"
          titleSize="s"
        />
      </>
    </EuiOutsideClickDetector>
  );
};

export const MapToolTip = React.memo(MapToolTipComponent);
