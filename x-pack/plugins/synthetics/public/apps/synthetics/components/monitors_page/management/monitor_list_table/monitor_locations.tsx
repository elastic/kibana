/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useTheme } from '@kbn/observability-shared-plugin/public';
import { LocationStatusBadges } from '../../../common/components/location_status_badges';
import { ServiceLocations, OverviewStatusState } from '../../../../../../../common/runtime_types';

interface Props {
  locations: ServiceLocations;
  monitorId: string;
  overviewStatus: OverviewStatusState | null;
}

export const MonitorLocations = ({ locations, monitorId, overviewStatus }: Props) => {
  const {
    eui: { euiColorVis9, euiColorVis0, euiColorDisabled },
  } = useTheme();

  const locationsToDisplay = locations.map((loc) => {
    const locById = `${monitorId}-${loc.id}`;

    let status: string = 'unknown';
    let color = euiColorDisabled;

    if (overviewStatus?.downConfigs[locById]) {
      status = 'down';
      color = euiColorVis9;
    } else if (overviewStatus?.upConfigs[locById]) {
      status = 'up';
      color = euiColorVis0;
    }

    return {
      id: loc.id,
      label: loc.label ?? loc.id,
      status,
      color,
    };
  });

  return (
    <LocationStatusBadges configId={monitorId} locations={locationsToDisplay} loading={false} />
  );
};
