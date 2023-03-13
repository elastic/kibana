/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useTheme } from '@kbn/observability-plugin/public';
import { LocationStatusBadges } from '../../../common/components/location_status_badges';
import { ServiceLocations, OverviewStatusState } from '../../../../../../../common/runtime_types';
import { LocationsStatus, useLocations } from '../../../../hooks';

interface Props {
  locations: ServiceLocations;
  monitorId: string;
  status: OverviewStatusState | null;
}

export const MonitorLocations = ({ locations, monitorId, status }: Props) => {
  const theme = useTheme();
  const { locations: allLocations } = useLocations();

  const locationsToDisplay = locations
    .map((loc) => {
      const fullLoc = allLocations.find((l) => l.id === loc.id);
      if (fullLoc) {
        return {
          id: fullLoc.id,
          label: fullLoc.label,
          ...getLocationStatusColor(theme, fullLoc.label, monitorId, status),
        };
      }
    })
    .filter(Boolean) as LocationsStatus;

  return (
    <LocationStatusBadges configId={monitorId} locations={locationsToDisplay} loading={false} />
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
    return { status: 'down', color: euiColorVis9 };
  } else if (overviewStatus?.upConfigs[locById]) {
    return { status: 'up', color: euiColorVis0 };
  }

  return { status: 'unknown', color: euiColorDisabled };
}
