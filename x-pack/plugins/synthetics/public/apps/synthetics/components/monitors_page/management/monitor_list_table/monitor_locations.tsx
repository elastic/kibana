/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { EuiBadge, EuiBadgeGroup, EuiIcon, useEuiTheme } from '@elastic/eui';
import { useTheme } from '@kbn/observability-plugin/public';
import {
  ServiceLocations,
  ServiceLocation,
  OverviewStatusState,
} from '../../../../../../../common/runtime_types';
import { useLocations } from '../../../../hooks';
import { EXPAND_LOCATIONS_LABEL } from './labels';

interface Props {
  locations: ServiceLocations;
  monitorId: string;
  status: OverviewStatusState | null;
}

const INITIAL_LIMIT = 3;

export const MonitorLocations = ({ locations, monitorId, status }: Props) => {
  const { euiTheme } = useEuiTheme();
  const theme = useTheme();
  const { locations: allLocations } = useLocations();
  const locationLabelsById = useMemo(() => {
    return allLocations.reduce((acc, cur) => {
      return { ...acc, [cur.id]: cur.label };
    }, {} as Record<string, string | undefined>);
  }, [allLocations]);
  const [toDisplay, setToDisplay] = useState(INITIAL_LIMIT);

  const locationsToDisplay = locations.slice(0, toDisplay);

  return (
    <EuiBadgeGroup css={{ width: '100%' }}>
      {locationsToDisplay.map((location: ServiceLocation) => (
        <EuiBadge
          key={location.id}
          color="hollow"
          className="eui-textTruncate"
          css={{ display: 'flex', maxWidth: 120, paddingLeft: euiTheme.size.xs, borderRadius: 3 }}
        >
          <EuiIcon
            type="dot"
            size="m"
            color={getLocationStatusColor(
              theme,
              locationLabelsById[location.id],
              monitorId,
              status
            )}
            css={{ marginRight: 2 }}
          />
          {locationLabelsById[location.id]}
        </EuiBadge>
      ))}
      {locations.length > toDisplay && (
        <EuiBadge
          color="hollow"
          onClick={() => {
            setToDisplay(locations.length);
          }}
          onClickAriaLabel={EXPAND_LOCATIONS_LABEL}
        >
          +{locations.length - INITIAL_LIMIT}
        </EuiBadge>
      )}
    </EuiBadgeGroup>
  );
};

function getLocationStatusColor(
  euiTheme: ReturnType<typeof useTheme>,
  locationLabel: string | undefined,
  monitorId: string,
  overviewStatus: OverviewStatusState | null
) {
  const {
    eui: { euiColorVis9, euiColorVis0, euiColorDisabled },
  } = euiTheme;

  const locById = `${monitorId}-${locationLabel}`;

  if (overviewStatus?.downConfigs[locById]) {
    return euiColorVis9;
  } else if (overviewStatus?.upConfigs[locById]) {
    return euiColorVis0;
  }

  return euiColorDisabled;
}
