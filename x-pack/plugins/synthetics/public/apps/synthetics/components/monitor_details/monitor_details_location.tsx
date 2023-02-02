/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';

import { useParams } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../../../plugin';
import { PLUGIN } from '../../../../../common/constants/plugin';
import { useSelectedLocation } from './hooks/use_selected_location';
import { MonitorLocationSelect } from '../common/components/monitor_location_select';
import { useSelectedMonitor } from './hooks/use_selected_monitor';

export const MonitorDetailsLocation = ({ isDisabled }: { isDisabled?: boolean }) => {
  const { monitor } = useSelectedMonitor();
  const { monitorId } = useParams<{ monitorId: string }>();

  const selectedLocation = useSelectedLocation();

  const { services } = useKibana<ClientPluginsStart>();

  return (
    <MonitorLocationSelect
      isDisabled={isDisabled}
      monitorLocations={monitor?.locations}
      configId={monitorId}
      selectedLocation={selectedLocation}
      onChange={useCallback(
        (id, label) => {
          services.application.navigateToApp(PLUGIN.SYNTHETICS_PLUGIN_ID, {
            path: `/monitor/${monitorId}?locationId=${id}`,
          });
        },
        [monitorId, services.application]
      )}
    />
  );
};
