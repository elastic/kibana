/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useState } from 'react';

import { sendPutSettings, useGetSettings } from '../../../hooks';

const URL_REGEX = /^(https):\/\/[^\s$.?#].[^\s]*$/gm;

export interface FleetServerHostForm {
  saveFleetServerHost: () => Promise<void>;
  fleetServerHost?: string;
  fleetServerHostSettings: string[];
  isFleetServerHostSubmitted: boolean;
  setFleetServerHost: React.Dispatch<React.SetStateAction<string | undefined>>;
  error?: string;
  validateFleetServerHost: () => boolean;
}

export const useFleetServerHost = (): FleetServerHostForm => {
  const [fleetServerHost, setFleetServerHost] = useState<string>();
  const [isFleetServerHostSubmitted, setIsFleetServerHostSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const { data: settings } = useGetSettings();

  useEffect(() => {
    if (settings?.item.fleet_server_hosts.length) {
      setFleetServerHost(settings.item.fleet_server_hosts[0]);
    }
  }, [settings?.item.fleet_server_hosts]);

  const validateFleetServerHost = useCallback(() => {
    if (!fleetServerHost) {
      setError(
        i18n.translate('xpack.fleet.fleetServerHost.requiredError', {
          defaultMessage: 'Fleet server host is required.',
        })
      );

      return false;
    } else if (!fleetServerHost.startsWith('https')) {
      setError(
        i18n.translate('xpack.fleet.fleetServerHost.requiresHttpsError', {
          defaultMessage: 'Fleet server host must begin with "https"',
        })
      );

      return false;
    } else if (!fleetServerHost.match(URL_REGEX)) {
      setError(
        i18n.translate('xpack.fleet.fleetServerSetup.addFleetServerHostInvalidUrlError', {
          defaultMessage: 'Invalid URL',
        })
      );

      return false;
    }

    return true;
  }, [fleetServerHost]);

  const saveFleetServerHost = useCallback(async () => {
    setIsFleetServerHostSubmitted(false);

    if (!validateFleetServerHost()) {
      return;
    }

    // If the Fleet Server host provided already exists in settings, don't submit it
    if (settings?.item.fleet_server_hosts.includes(fleetServerHost!)) {
      setIsFleetServerHostSubmitted(true);
      return;
    }

    const res = await sendPutSettings({
      fleet_server_hosts: [fleetServerHost!, ...(settings?.item.fleet_server_hosts || [])],
    });

    if (res.error) {
      throw res.error;
    }

    setIsFleetServerHostSubmitted(true);
  }, [fleetServerHost, settings?.item.fleet_server_hosts, validateFleetServerHost]);

  return {
    saveFleetServerHost,
    fleetServerHost,
    fleetServerHostSettings: settings?.item.fleet_server_hosts ?? [],
    isFleetServerHostSubmitted,
    setFleetServerHost,
    error,
    validateFleetServerHost,
  };
};
