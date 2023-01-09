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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useTheme } from '@kbn/observability-plugin/public';
import React, { useMemo, useState, useCallback } from 'react';

import { PLUGIN } from '../../../../../common/constants/plugin';
import { useLocations } from '../../hooks';
import { useStatusByLocation } from '../../hooks';
import { useSelectedLocation } from './hooks/use_selected_location';
import { useSelectedMonitor } from './hooks/use_selected_monitor';

export const MonitorDetailsLocation: React.FC = () => {
  const { monitor } = useSelectedMonitor();
  const { services } = useKibana();
  const { locations } = useLocations();
  const theme = useTheme();

  const { locations: locationsStatus, loading: loadingLocationsStatus } = useStatusByLocation();
  const selectedLocation = useSelectedLocation();

  const [isLocationListOpen, setIsLocationListOpen] = useState(false);
  const openLocationList = useCallback(() => setIsLocationListOpen(true), []);
  const closeLocationList = useCallback(() => setIsLocationListOpen(false), []);

  const locationList = useMemo(() => {
    if (!selectedLocation || !monitor) {
      return '';
    }

    if (monitor?.locations && monitor.locations.length > 1) {
      const button = (
        <EuiLink onClick={openLocationList}>
          {selectedLocation.label} <EuiIcon type="arrowDown" />
        </EuiLink>
      );

      const menuItems = loadingLocationsStatus
        ? [<span key="loading">Loading...</span>]
        : monitor.locations
            .map((location) => {
              const fullLocation = locations.find((l) => l.id === location.id);
              if (!fullLocation) {
                return;
              }

              const locationStatus = locationsStatus.find(
                (ls) => ls.observer?.geo?.name === fullLocation.label
              );

              const locationHealthColor =
                typeof locationStatus === 'undefined'
                  ? 'subdued'
                  : (locationStatus?.summary?.down ?? 0) > 0
                  ? theme.eui.euiColorVis9 // down
                  : theme.eui.euiColorVis0; // up

              return (
                <EuiContextMenuItem
                  key={location.label}
                  icon={<EuiHealth color={locationHealthColor} />}
                  onClick={() => {
                    closeLocationList();
                    services.application!.navigateToApp(PLUGIN.SYNTHETICS_PLUGIN_ID, {
                      path: `/monitor/${monitor.config_id}?locationId=${fullLocation.id}`,
                    });
                  }}
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
    isLocationListOpen,
    loadingLocationsStatus,
    locations,
    locationsStatus,
    monitor,
    openLocationList,
    selectedLocation,
    services.application,
    theme,
  ]);

  if (!selectedLocation || !monitor) {
    return (
      <EuiDescriptionList
        listItems={[{ title: LOCATION_LABEL, description: <EuiLoadingContent lines={1} /> }]}
      />
    );
  }

  return <EuiDescriptionList listItems={[{ title: LOCATION_LABEL, description: locationList }]} />;
};

const LOCATION_LABEL = i18n.translate('xpack.synthetics.monitorLocation.locationLabel', {
  defaultMessage: 'Location',
});
