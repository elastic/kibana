/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiOutsideClickDetector,
  EuiPopoverTitle,
} from '@elastic/eui';
import { TagLabel } from '../../availability_reporting';
import { UptimeThemeContext } from '../../../../../contexts';
import { AppState } from '../../../../../state';
import { monitorLocationsSelector } from '../../../../../state/selectors';
import { useMonitorId } from '../../../../../hooks';
import { MonitorLocation } from '../../../../../../common/runtime_types/monitor';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { RenderTooltipContentParams } from '../../../../../../../maps/public/classes/tooltips/tooltip_property';
import { formatAvailabilityValue } from '../../availability_reporting/availability_reporting';
import { LastCheckLabel } from '../../translations';

type MapToolTipProps = Partial<RenderTooltipContentParams>;

export const MapToolTipComponent = ({ closeTooltip, features = [] }: MapToolTipProps) => {
  const { id: featureId, layerId } = features[0] ?? {};
  const locationName = featureId?.toString();
  const {
    colors: { gray, danger },
  } = useContext(UptimeThemeContext);

  const monitorId = useMonitorId();

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
            <TagLabel label={locationName} color={gray} status="up" />
          ) : (
            <TagLabel label={locationName} color={danger} status="down" />
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
