/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EXPAND_LOCATIONS_LABEL } from '../../monitors_page/management/monitor_list_table/labels';
import { LocationsStatus } from '../../../hooks';
const DEFAULT_DISPLAY_COUNT = 3;

export const LocationStatusBadges = ({
  loading,
  locations,
}: {
  locations: LocationsStatus;
  loading: boolean;
}) => {
  const [toDisplay, setToDisplay] = useState(DEFAULT_DISPLAY_COUNT);

  if (loading && !locations) {
    return <EuiLoadingSpinner />;
  }

  const locationsToDisplay = locations.slice(0, toDisplay);

  return (
    <EuiFlexGroup wrap gutterSize="xs" style={{ maxWidth: 450 }}>
      {locationsToDisplay.map((loc) => (
        <EuiFlexItem key={loc.id} grow={false}>
          <EuiBadge
            iconType={() => <EuiIcon size="s" type="dot" color={loc.color} />}
            color="hollow"
          >
            {loc.label}
          </EuiBadge>
        </EuiFlexItem>
      ))}
      {locations.length > toDisplay && (
        <EuiFlexItem key={locations.length - toDisplay} grow={false}>
          <EuiToolTip
            content={
              <>
                {locations.slice(toDisplay, locations.length).map((loc) => (
                  <EuiHealth color={loc.color}>{loc.label}</EuiHealth>
                ))}
              </>
            }
          >
            <EuiBadge
              color="hollow"
              onClick={() => {
                setToDisplay(locations.length);
              }}
              onClickAriaLabel={EXPAND_LOCATIONS_LABEL}
            >
              +{locations.length - toDisplay}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {toDisplay > DEFAULT_DISPLAY_COUNT && (
        <EuiFlexItem key={locations.length - 3} grow={false}>
          <EuiToolTip content={COLLAPSE_LOCATIONS_LABEL}>
            <EuiBadge
              color="hollow"
              onClick={() => {
                setToDisplay(DEFAULT_DISPLAY_COUNT);
              }}
              onClickAriaLabel={COLLAPSE_LOCATIONS_LABEL}
            >
              -{locations.length - DEFAULT_DISPLAY_COUNT}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const COLLAPSE_LOCATIONS_LABEL = i18n.translate(
  'xpack.synthetics.management.monitorList.locations.collapse',
  {
    defaultMessage: 'Click to collapse locations',
  }
);
