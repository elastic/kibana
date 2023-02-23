/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState, useMemo } from 'react';

import {
  sendPostFleetServerHost,
  useGetFleetServerHosts,
  useComboInput,
  useInput,
  useSwitchInput,
  validateInputs,
} from '../../../hooks';
import type { FleetServerHost } from '../../../types';

import {
  validateName,
  validateFleetServerHosts,
} from '../../../sections/settings/components/fleet_server_hosts_flyout/use_fleet_server_host_form';

export interface FleetServerHostForm {
  fleetServerHosts: FleetServerHost[];
  saveFleetServerHost: (host: Omit<FleetServerHost, 'id'>) => Promise<FleetServerHost>;
  isFleetServerHostSubmitted: boolean;
  fleetServerHost?: FleetServerHost | null;
  setFleetServerHost: React.Dispatch<React.SetStateAction<FleetServerHost | undefined | null>>;
  validate: () => boolean;
  error?: string;
  inputs: {
    hostUrlsInput: ReturnType<typeof useComboInput>;
    nameInput: ReturnType<typeof useInput>;
    isDefaultInput: ReturnType<typeof useSwitchInput>;
  };
}

export const useFleetServerHost = (): FleetServerHostForm => {
  const [fleetServerHost, setFleetServerHost] = useState<FleetServerHost | null>();
  const [isFleetServerHostSubmitted, setIsFleetServerHostSubmitted] = useState<boolean>(false);

  const isPreconfigured = fleetServerHost?.is_preconfigured ?? false;
  const nameInput = useInput('', validateName, isPreconfigured);
  const isDefaultInput = useSwitchInput(false, isPreconfigured || fleetServerHost?.is_default);
  const hostUrlsInput = useComboInput('hostUrls', [], validateFleetServerHosts, isPreconfigured);

  const inputs = useMemo(
    () => ({
      nameInput,
      isDefaultInput,
      hostUrlsInput,
    }),
    [nameInput, isDefaultInput, hostUrlsInput]
  );

  const validate = useCallback(() => validateInputs(inputs), [inputs]);

  const { data, resendRequest: refreshGetFleetServerHosts } = useGetFleetServerHosts();

  const fleetServerHosts = useMemo(() => data?.items ?? [], [data?.items]);

  const setDefaultInputValue = isDefaultInput.setValue;
  useEffect(() => {
    const defaultHost = fleetServerHosts.find((item) => item.is_default === true);
    if (defaultHost) {
      setFleetServerHost(defaultHost);
      setDefaultInputValue(false);
    } else {
      setFleetServerHost(null);
      setDefaultInputValue(true);
    }
  }, [fleetServerHosts, setDefaultInputValue]);

  const saveFleetServerHost = useCallback(
    async (newFleetServerHost: Omit<FleetServerHost, 'id'>) => {
      setIsFleetServerHostSubmitted(false);

      const res = await sendPostFleetServerHost({
        name: newFleetServerHost?.name,
        host_urls: newFleetServerHost?.host_urls,
        is_default: newFleetServerHost?.is_default,
      });
      if (res.error) {
        throw res.error;
      }
      if (!res.data) {
        throw new Error('No data');
      }

      await refreshGetFleetServerHosts();
      setIsFleetServerHostSubmitted(true);
      setFleetServerHost(res.data.item);

      return res.data.item;
    },
    [refreshGetFleetServerHosts]
  );

  return {
    fleetServerHosts,
    saveFleetServerHost,
    fleetServerHost,
    isFleetServerHostSubmitted,
    setFleetServerHost,
    validate,
    inputs,
  };
};
