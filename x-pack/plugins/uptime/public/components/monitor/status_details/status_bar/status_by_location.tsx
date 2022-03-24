/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { MonitorLocation } from '../../../../../common/runtime_types';

interface StatusByLocationsProps {
  locations: MonitorLocation[];
}

export const StatusByLocations = ({ locations }: StatusByLocationsProps) => {
  const upLocations: string[] = [];
  const downLocations: string[] = [];

  if (locations)
    locations.forEach((item: any) => {
      if (item.summary.down === 0) {
        upLocations.push(item.geo.name);
      } else {
        downLocations.push(item.geo.name);
      }
    });

  let statusMessage = '';
  let status = '';
  if (downLocations.length === 0) {
    // for Messaging like 'Up in 1 Location' or 'Up in 2 Locations'
    statusMessage = `${locations.length}`;
    status = 'Up';
  } else if (downLocations.length > 0) {
    // for Messaging like 'Down in 1/2 Locations'
    status = 'Down';
    statusMessage = `${downLocations.length}/${locations.length}`;
    if (downLocations.length === locations.length) {
      // for Messaging like 'Down in 2 Locations'
      statusMessage = `${locations.length}`;
    }
  }

  return (
    <EuiTitle size="s">
      <h2>
        {locations.length <= 1 ? (
          <FormattedMessage
            id="xpack.uptime.monitorStatusBar.locations.oneLocStatus"
            values={{
              status,
              loc: statusMessage,
            }}
            defaultMessage="{status} in {loc} location"
          />
        ) : (
          <FormattedMessage
            id="xpack.uptime.monitorStatusBar.locations.upStatus"
            values={{
              status,
              loc: statusMessage,
            }}
            defaultMessage="{status} in {loc} locations"
          />
        )}
      </h2>
    </EuiTitle>
  );
};
