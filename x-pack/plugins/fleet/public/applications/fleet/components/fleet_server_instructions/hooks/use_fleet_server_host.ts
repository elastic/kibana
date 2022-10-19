/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState } from 'react';

import { intersection } from 'lodash';

import { sendPostFleetServerHost, useGetFleetServerHosts } from '../../../hooks';
import type { FleetServerHost } from '../../../types';

export interface FleetServerHostForm {
  saveFleetServerHost: (host: FleetServerHost) => Promise<void>;
  fleetServerHost?: FleetServerHost;
  fleetServerHostSettings: string[];
  isFleetServerHostSubmitted: boolean;
  setFleetServerHost: React.Dispatch<React.SetStateAction<FleetServerHost | undefined>>;
  error?: string;
}

export const useFleetServerHost = (): FleetServerHostForm => {
  const [fleetServerHost, setFleetServerHost] = useState<FleetServerHost>();
  const [isFleetServerHostSubmitted, setIsFleetServerHostSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string>();

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

      // if (!isValid) {
      //   console.log('not valid, return');
      //   return;
      // }

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
    fleetServerHostSettings: data?.items[0]?.host_urls ?? [],
    isFleetServerHostSubmitted,
    setFleetServerHost,
    error,
  };
};
