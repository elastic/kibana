/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState } from 'react';

import { intersection } from 'lodash';

import {
  sendPostFleetServerHost,
  useGetFleetServerHosts,
  useComboInput,
  useInput,
} from '../../../hooks';
import type { FleetServerHost } from '../../../types';

import {
  validateName,
  validateFleetServerHosts,
} from '../../../sections/settings/components/fleet_server_hosts_flyout/use_fleet_server_host_form';

export interface FleetServerHostForm {
  saveFleetServerHost: (host: FleetServerHost) => Promise<void>;
  fleetServerHost?: FleetServerHost;
  isFleetServerHostSubmitted: boolean;
  setFleetServerHost: React.Dispatch<React.SetStateAction<FleetServerHost | undefined>>;
  validate: () => boolean;
  error?: string;
  inputs: {
    hostUrlsInput: ReturnType<typeof useComboInput>;
    nameInput: ReturnType<typeof useInput>;
  };
}

export const useFleetServerHost = (): FleetServerHostForm => {
  const [fleetServerHost, setFleetServerHost] = useState<FleetServerHost>();
  const [isFleetServerHostSubmitted, setIsFleetServerHostSubmitted] = useState<boolean>(false);

  const isPreconfigured = fleetServerHost?.is_preconfigured ?? false;
  const nameInput = useInput(fleetServerHost?.name ?? '', validateName, isPreconfigured);

  const hostUrlsInput = useComboInput(
    'hostUrls',
    fleetServerHost?.host_urls || [],
    validateFleetServerHosts,
    isPreconfigured
  );
  const validate = useCallback(
    () => hostUrlsInput.validate() && nameInput.validate(),
    [hostUrlsInput, nameInput]
  );

  const { data } = useGetFleetServerHosts();

  useEffect(() => {
    const fleetServerHosts = data?.items ?? [];
    const defaultHost = fleetServerHosts.find((item) => item.is_default === true);

    // Get the default host, otherwise the first fleet server found
    if (defaultHost) {
      setFleetServerHost(defaultHost);
    } else {
      setFleetServerHost(fleetServerHosts[0]);
    }
  }, [data?.items, fleetServerHost]);

  const saveFleetServerHost = useCallback(
    async (newFleetServerHost: FleetServerHost) => {
      setIsFleetServerHostSubmitted(false);
      setFleetServerHost(newFleetServerHost);

      const fleetServerHostExists = data?.items.reduce((acc, curr) => {
        const hostsIntersection = intersection(curr.host_urls, newFleetServerHost?.host_urls);
        return hostsIntersection.length > 0 || acc;
      }, false);

      // If the Fleet Server host provided already exists in settings, don't submit it
      if (fleetServerHostExists) {
        setIsFleetServerHostSubmitted(true);
        return;
      }
      if (newFleetServerHost) {
        const res = await sendPostFleetServerHost({
          name: newFleetServerHost?.name,
          host_urls: newFleetServerHost?.host_urls,
          is_default: newFleetServerHost?.is_default,
        });
        if (res.error) {
          throw res.error;
        }
      }
      setIsFleetServerHostSubmitted(true);
    },
    [data?.items]
  );

  return {
    saveFleetServerHost,
    fleetServerHost,
    isFleetServerHostSubmitted,
    setFleetServerHost,
    validate,
    inputs: {
      hostUrlsInput,
      nameInput,
    },
  };
};
