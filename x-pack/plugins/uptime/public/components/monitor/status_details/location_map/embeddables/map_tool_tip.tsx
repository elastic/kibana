/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import React, { useContext, useState } from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiOutsideClickDetector,
  EuiPopoverTitle,
  EuiStat,
  EuiText,
} from '@elastic/eui';
import { TagLabel } from '../../availability_reporting';
import { UptimeThemeContext } from '../../../../../contexts';
import { AppState } from '../../../../../state';
import { monitorLocationsSelector } from '../../../../../state/selectors';
import { useMonitorId } from '../../../../../hooks';
import { MonitorLocation } from '../../../../../../common/runtime_types/monitor';
import { RenderTooltipContentParams } from '../../../../../../../../legacy/plugins/maps/public';
import { formatAvailabilityValue } from '../../availability_reporting/availability_reporting';
import { LastCheckLabel } from '../../translations';

type MapToolTipProps = Partial<RenderTooltipContentParams>;

const TimestampText = styled(EuiText)`
  display: inline-block;
  text-transform: initial;
  margin-left: 5px;
`;

export const MapToolTipComponent = ({ closeTooltip, features = [] }: MapToolTipProps) => {
  const { id: featureId, layerId } = features[0] ?? {};
  const locationName = featureId?.toString();
  const {
    colors: { gray, danger },
  } = useContext(UptimeThemeContext);

  const monitorId = useMonitorId();

  const [isOpen, setIsOpen] = useState(false);

  const monitorLocations = useSelector((state: AppState) =>
    monitorLocationsSelector(state, monitorId)
  );
  if (!locationName || !monitorLocations?.locations) {
    return null;
  }
  const {
    timestamp,
    up_history: ups,
    down_history: downs,
  }: MonitorLocation = monitorLocations.locations!.find(
    ({ geo }: MonitorLocation) => geo.name === locationName
  )!;

  const availability = (ups / (ups + downs)) * 100;

  return (
    <EuiOutsideClickDetector
      onOutsideClick={() => {
        if (closeTooltip != null) {
          closeTooltip();
        }
      }}
    >
      <>
        <EuiPopoverTitle>
          {layerId === 'up_points' ? (
            <TagLabel label={locationName} color={gray} />
          ) : (
            <TagLabel label={locationName} color={danger} />
          )}
        </EuiPopoverTitle>
        <EuiDescriptionList type="column" textStyle="reverse" compressed={true}>
          <EuiDescriptionListTitle>Availability</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {i18n.translate('xpack.uptime.mapToolTip.AvailabilityStat.title', {
              defaultMessage: '{value} %',
              values: { value: formatAvailabilityValue(availability) },
              description: 'A percentage value like 23.5%',
            })}
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>{LastCheckLabel}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {moment(timestamp).fromNow()}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </>
    </EuiOutsideClickDetector>
  );
};

export const MapToolTip = React.memo(MapToolTipComponent);
