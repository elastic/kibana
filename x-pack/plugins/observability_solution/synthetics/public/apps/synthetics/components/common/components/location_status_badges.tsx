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
import { LocationsStatus } from '../../../hooks';
import { useMonitorDetailLocator } from '../../../hooks/use_monitor_detail_locator';
const DEFAULT_DISPLAY_COUNT = 3;

export const LocationStatusBadges = ({
  loading,
  locations,
  configId,
}: {
  locations: LocationsStatus;
  loading: boolean;
  configId: string;
}) => {
  const [toDisplay, setToDisplay] = useState(DEFAULT_DISPLAY_COUNT);

  if (loading && !locations) {
    return <EuiLoadingSpinner />;
  }

  const locationsToDisplay = locations.slice(0, toDisplay);

  return (
    <EuiFlexGroup
      gutterSize="xs"
      css={{ maxWidth: 450, overflow: 'hidden' }}
      wrap
      responsive={false}
    >
      {locationsToDisplay.map((loc) => (
        <EuiFlexItem
          key={loc.id}
          grow={false}
          css={{ overflow: 'hidden', flexBasis: 'fit-content' }}
        >
          <MonitorDetailLinkForLocation
            configId={configId}
            locationId={loc.id}
            locationLabel={loc.label}
            color={loc.color}
          />
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
        <EuiFlexItem key={locations.length - 3} grow={false} css={{ overflow: 'hidden' }}>
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

const MonitorDetailLinkForLocation = ({
  configId,
  locationId,
  locationLabel,
  color,
}: {
  configId: string;
  locationId: string;
  locationLabel: string;
  color: string;
}) => {
  const monitorDetailLinkUrl = useMonitorDetailLocator({
    configId,
    locationId,
  });

  return (
    <EuiBadge
      iconType={() => <EuiIcon size="m" type="dot" color={color} />}
      color="hollow"
      href={monitorDetailLinkUrl ?? '/'}
      aria-label={i18n.translate('xpack.synthetics.management.location.ariaLabel', {
        defaultMessage: 'View details for {locationLabel} location',
        values: {
          locationLabel,
        },
      })}
    >
      {locationLabel}
    </EuiBadge>
  );
};

const EXPAND_LOCATIONS_LABEL = i18n.translate(
  'xpack.synthetics.management.monitorList.locations.expand',
  {
    defaultMessage: 'Click to view remaining locations',
  }
);

const COLLAPSE_LOCATIONS_LABEL = i18n.translate(
  'xpack.synthetics.management.monitorList.locations.collapse',
  {
    defaultMessage: 'Click to collapse locations',
  }
);
