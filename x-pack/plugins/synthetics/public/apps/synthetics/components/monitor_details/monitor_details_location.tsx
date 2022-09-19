/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDescriptionList,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState, useCallback } from 'react';
import { useLocations } from '../../hooks';
import { useSelectedLocation } from './hooks/use_selected_location';
import { useSelectedMonitor } from './hooks/use_selected_monitor';

export const MonitorDetailsLocation: React.FC = () => {
  const { monitor } = useSelectedMonitor();
  const { locations } = useLocations();

  const selectedLocation = useSelectedLocation();

  const [isLocationListOpen, setIsLocationListOpen] = useState(false);
  const openLocationList = useCallback(() => setIsLocationListOpen(true), []);
  const closeLocationList = useCallback(() => setIsLocationListOpen(false), []);

  const locationList = useMemo(() => {
    if (!selectedLocation) {
      return '';
    }

    if (monitor?.locations && monitor.locations.length > 1) {
      const button = (
        <EuiLink onClick={openLocationList}>
          {selectedLocation.label} <EuiIcon type="arrowDown" />
        </EuiLink>
      );

      const menuItems = monitor.locations
        .map((monitorLocation) => {
          const fullLocation = locations.find((l) => l.id === monitorLocation.id);
          if (!fullLocation) {
            return;
          }
          return (
            <EuiContextMenuItem
              key={fullLocation.label}
              icon={<EuiHealth color="success" />} // FIXME: get health for monitor at location
              onClick={() => {}} // FIXME: navigate to monitor
            >
              {fullLocation.label}
            </EuiContextMenuItem>
          );
        })
        .filter((l): l is JSX.Element => typeof l !== undefined);

      return (
        <EuiPopover
          button={button}
          isOpen={isLocationListOpen}
          closePopover={closeLocationList}
          panelPaddingSize="none"
        >
          <EuiContextMenuPanel items={menuItems} title="Locations" />
        </EuiPopover>
      );
    } else {
      return selectedLocation.label;
    }
  }, [
    closeLocationList,
    isLocationListOpen,
    locations,
    monitor,
    openLocationList,
    selectedLocation,
  ]);

  if (!selectedLocation) {
    return null;
  }

  return <EuiDescriptionList listItems={[{ title: LOCATION_LABEL, description: locationList }]} />;
};

const LOCATION_LABEL = i18n.translate('xpack.synthetics.monitorLocation.locationLabel', {
  defaultMessage: 'Location',
});
