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
  handleSubmitForm: () => Promise<FleetServerHost | undefined>;
  isFleetServerHostSubmitted: boolean;
  fleetServerHost?: FleetServerHost | null;
  setFleetServerHost: React.Dispatch<React.SetStateAction<FleetServerHost | undefined | null>>;
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

  const handleSubmitForm = useCallback(async () => {
    if (!validate()) {
      return;
    }
    setIsFleetServerHostSubmitted(false);
    const newFleetServerHost = {
      name: inputs.nameInput.value,
      host_urls: inputs.hostUrlsInput.value,
      is_default: inputs.isDefaultInput.value,
    };

    const res = await sendPostFleetServerHost(newFleetServerHost);
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
  }, [
    validate,
    refreshGetFleetServerHosts,
    inputs.nameInput.value,
    inputs.hostUrlsInput.value,
    inputs.isDefaultInput.value,
  ]);

  return {
    fleetServerHosts,
    handleSubmitForm,
    fleetServerHost,
    isFleetServerHostSubmitted,
    setFleetServerHost,
    inputs,
  };
};
