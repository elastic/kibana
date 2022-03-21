/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback, useState } from 'react';

import { sendPutSettings, useGetSettings } from '../../../hooks';

const URL_REGEX = /^(https?):\/\/[^\s$.?#].[^\s]*$/gm;

export interface FleetServerHostForm {
  saveFleetServerHost: () => Promise<void>;
  fleetServerHost?: string;
  setFleetServerHost: React.Dispatch<React.SetStateAction<string | undefined>>;
  error?: string;
  validateFleetServerHost: () => boolean;
}

export const useFleetServerHost = (): FleetServerHostForm => {
  const [fleetServerHost, setFleetServerHost] = useState<string>();
  const [error, setError] = useState<string>();

  const { data: settings } = useGetSettings();

  const validateFleetServerHost = useCallback(() => {
    if (fleetServerHost && fleetServerHost.match(URL_REGEX)) {
      setError(undefined);

      return true;
    } else {
      setError(
        i18n.translate('xpack.fleet.fleetServerSetup.addFleetServerHostInvalidUrlError', {
          defaultMessage: 'Invalid URL',
        })
      );

      return false;
    }
  }, [fleetServerHost]);

  const saveFleetServerHost = useCallback(async () => {
    if (!validateFleetServerHost()) {
      return;
    }

    const res = await sendPutSettings({
      fleet_server_hosts: [fleetServerHost!, ...(settings?.item.fleet_server_hosts || [])],
    });
    if (res.error) {
      throw res.error;
    }
  }, [fleetServerHost, settings?.item.fleet_server_hosts, validateFleetServerHost]);

  return {
    saveFleetServerHost,
    fleetServerHost,
    setFleetServerHost,
    error,
    validateFleetServerHost,
  };
};
