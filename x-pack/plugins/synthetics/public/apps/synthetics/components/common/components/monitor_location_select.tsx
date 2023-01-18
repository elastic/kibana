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
  EuiLoadingContent,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState, useCallback } from 'react';

import {
  EncryptedSyntheticsSavedMonitor,
  ServiceLocation,
} from '../../../../../../common/runtime_types';
import { useStatusByLocation } from '../../../hooks';

export const MonitorLocationSelect = ({
  monitorLocations,
  configId,
  selectedLocation,
  compressed,
  onChange,
  isDisabled,
}: {
  compressed?: boolean;
  isDisabled?: boolean;
  configId: string;
  onChange: (label: string, id: string) => void;
  selectedLocation?: ServiceLocation | null;
  monitorLocations?: EncryptedSyntheticsSavedMonitor['locations'];
}) => {
  const { locations: locationsStatus, loading: loadingLocationsStatus } = useStatusByLocation({
    configId,
    monitorLocations,
  });

  const [isLocationListOpen, setIsLocationListOpen] = useState(false);
  const openLocationList = useCallback(() => setIsLocationListOpen(true), []);
  const closeLocationList = useCallback(() => setIsLocationListOpen(false), []);

  const locationList = useMemo(() => {
    if (!selectedLocation || !monitorLocations) {
      return '';
    }

    if (monitorLocations.length > 1) {
      const button = (
        <EuiLink onClick={openLocationList} disabled={isDisabled}>
          {selectedLocation.label} <EuiIcon type="arrowDown" />
        </EuiLink>
      );

      const menuItems =
        loadingLocationsStatus && !locationsStatus
          ? [<span key="loading">Loading...</span>]
          : locationsStatus
              .map((location) => {
                return (
                  <EuiContextMenuItem
                    key={location.label}
                    icon={<EuiHealth color={location.color} />}
                    onClick={() => {
                      closeLocationList();
                      onChange(location.id, location.label);
                    }}
                  >
                    {location.label}
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
          <EuiContextMenuPanel
            items={menuItems}
            size="s"
            title={i18n.translate(
              'xpack.synthetics.monitorLocation.locationContextMenuTitleLabel',
              { defaultMessage: 'Go to location' }
            )}
          />
        </EuiPopover>
      );
    } else {
      return selectedLocation.label;
    }
  }, [
    closeLocationList,
    isDisabled,
    isLocationListOpen,
    loadingLocationsStatus,
    locationsStatus,
    monitorLocations,
    onChange,
    openLocationList,
    selectedLocation,
  ]);

  if (!selectedLocation || !monitorLocations) {
    return (
      <EuiDescriptionList
        compressed={compressed}
        listItems={[{ title: LOCATION_LABEL, description: <EuiLoadingContent lines={1} /> }]}
      />
    );
  }

  return (
    <EuiDescriptionList
      compressed={compressed}
      listItems={[{ title: LOCATION_LABEL, description: locationList }]}
    />
  );
};

const LOCATION_LABEL = i18n.translate('xpack.synthetics.monitorLocation.locationLabel', {
  defaultMessage: 'Location',
});
