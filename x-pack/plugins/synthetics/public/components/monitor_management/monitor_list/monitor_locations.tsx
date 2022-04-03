/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import { ServiceLocations, ServiceLocation } from '../../../../common/runtime_types';
import { EXPAND_LOCATIONS_LABEL } from '../../overview/monitor_list/columns/translations';

interface Props {
  locations: ServiceLocations;
}

const INITIAL_LIMIT = 3;

export const MonitorLocations = ({ locations }: Props) => {
  const [toDisplay, setToDisplay] = useState(INITIAL_LIMIT);

  const locationsToDisplay = locations.slice(0, toDisplay);

  return (
    <EuiBadgeGroup css={{ width: '100%' }}>
      {locationsToDisplay.map((location: ServiceLocation) => (
        <EuiBadge
          key={location.id}
          color="hollow"
          className="eui-textTruncate"
          css={{ display: 'flex', maxWidth: 120 }}
        >
          {location.label}
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
