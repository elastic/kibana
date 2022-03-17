/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import {
  sendGenerateServiceToken,
  sendPutSettings,
  useGetAgentPolicies,
  useGetSettings,
  useStartServices,
} from '../../../hooks';
import { policyHasFleetServer } from '../../../services';

const URL_REGEX = /^(https?):\/\/[^\s$.?#].[^\s]*$/gm;

export type QuickStartCreateFormStatus = 'initial' | 'loading' | 'error' | 'success';
export interface QuickStartCreateForm {
  status: QuickStartCreateFormStatus;
  error?: string;
  submit: (fleetServerHost: string) => void;
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

  const [serviceToken, setServiceToken] = useState<string>();
  const [fleetServerPolicyId, setFleetServerPolicyId] = useState<string | undefined>();

  const { data: settings, resendRequest: refreshSettings } = useGetSettings();
  const { data: agentPoliciesData } = useGetAgentPolicies({
    full: true,
  });

  const { notifications } = useStartServices();

  const agentPoliciesWithFleetServerIntegration = useMemo(
    () =>
      agentPoliciesData
        ? agentPoliciesData.items?.filter((item) => policyHasFleetServer(item))
        : [],
    [agentPoliciesData]
  );

  useEffect(() => {
    // Default to the first policy found with a fleet server integration installed
    if (agentPoliciesWithFleetServerIntegration.length && !fleetServerPolicyId) {
      setFleetServerPolicyId(agentPoliciesWithFleetServerIntegration[0].id);
    }
  }, [agentPoliciesWithFleetServerIntegration, fleetServerPolicyId]);

  const validateHostUrl = useCallback(
    (host: string) => {
      if (host.match(URL_REGEX)) {
        setError(undefined);
        return true;
      } else {
        setStatus('error');
        setError(
          i18n.translate('xpack.fleet.fleetServerSetup.addFleetServerHostInvalidUrlError', {
            defaultMessage: 'Invalid URL',
          })
        );
        return false;
      }
    },
    [setError]
  );

  const addFleetServerHost = useCallback(
    async (host: string) => {
      const res = await sendPutSettings({
        fleet_server_hosts: [host, ...(settings?.item?.fleet_server_hosts || [])],
      });

      if (res.error) {
        throw res.error;
      }

      refreshSettings();
    },
    [refreshSettings, settings?.item?.fleet_server_hosts]
  );

  const generateServiceToken = useCallback(async () => {
    try {
      const { data } = await sendGenerateServiceToken();
      if (data?.value) {
        setServiceToken(data?.value);
      }
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.fleetServerSetup.errorGeneratingTokenTitleText', {
          defaultMessage: 'Error generating token',
        }),
      });
    }
  }, [notifications.toasts]);

  const submit = useCallback(
    async (fleetServerHost: string) => {
      try {
        setStatus('loading');

        if (validateHostUrl(fleetServerHost)) {
          await addFleetServerHost(fleetServerHost);
          await generateServiceToken();

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
    },
    [addFleetServerHost, generateServiceToken, notifications.toasts, validateHostUrl]
  );

  return { status, error, submit, serviceToken };
};
