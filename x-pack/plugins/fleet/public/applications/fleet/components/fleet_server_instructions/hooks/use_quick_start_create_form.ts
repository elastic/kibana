/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../../hooks';

import { useSelectFleetServerPolicy } from './use_select_fleet_server_policy';
import { useServiceToken } from './use_service_token';
import { useFleetServerHost } from './use_fleet_server_host';

export type QuickStartCreateFormStatus = 'initial' | 'loading' | 'error' | 'success';

export interface QuickStartCreateForm {
  status: QuickStartCreateFormStatus;
  error?: string;
  submit: () => void;
  fleetServerHost?: string;
  onFleetServerHostChange: (value: string) => void;
  fleetServerPolicyId?: string;
  serviceToken?: string;
}

/**
 * Provides a unified interface that combines the following operations:
 * 1. Setting a Fleet Server host in Fleet's settings
 * 2. Creating an agent policy that contains the `fleet_server` integration
 * 3. Generating a service token used by Fleet Server
 */
export const useQuickStartCreateForm = (): QuickStartCreateForm => {
  const [status, setStatus] = useState<'initial' | 'loading' | 'error' | 'success'>('initial');
  const [error, setError] = useState<string | undefined>();

  const {
    fleetServerHost,
    setFleetServerHost,
    validateFleetServerHost,
    saveFleetServerHost,
    error: fleetServerError,
  } = useFleetServerHost();

  useEffect(() => {
    setError(fleetServerError);
  }, [fleetServerError]);

  const { notifications } = useStartServices();
  const { fleetServerPolicyId } = useSelectFleetServerPolicy();
  const { serviceToken, generateServiceToken } = useServiceToken();

  const onFleetServerHostChange = useCallback(
    (value: string) => {
      setFleetServerHost(value);
    },
    [setFleetServerHost]
  );

  const submit = useCallback(async () => {
    try {
      setStatus('loading');

      if (validateFleetServerHost()) {
        await saveFleetServerHost();
        await generateServiceToken();

        setFleetServerHost(fleetServerHost);
        setStatus('success');
      }
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.fleetServerSetup.errorAddingFleetServerHostTitle', {
          defaultMessage: 'Error adding Fleet Server host',
        }),
      });

      setStatus('error');
      alert(err.message);
      setError(err.message);
    }
  }, [
    validateFleetServerHost,
    saveFleetServerHost,
    generateServiceToken,
    setFleetServerHost,
    fleetServerHost,
    notifications.toasts,
  ]);

  return {
    status,
    error,
    submit,
    fleetServerPolicyId,
    fleetServerHost,
    onFleetServerHostChange,
    serviceToken,
  };
};
