/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { filterIntegrations } from '../utils';
import { useKibana } from './use_kibana';

type IntegrationInstallStatus = 'installed' | 'installing' | 'install_failed';

const INTEGRATIONS_URL = '/api/fleet/epm/packages';

const INTEGRATIONS_CALL_TIMEOUT = 2000;

export interface IntegrationResponse {
  items: Integration[];
}

export interface Integration {
  categories: string[];
  id: string;
  status: IntegrationInstallStatus;
}

/**
 * Retrieves integrations from the Fleet plugin endpoint /api/fleet/epm/packages.
 * The integrations are then filtered, and we only keep the installed ones,
 * with category threat_intel and excluding the ti_utils integration.
 * We cancel the query in case it's taking too long to not block the Indicators page for the user.
 */
export const useIntegrations = () => {
  const { http } = useKibana().services;
  const queryKey = ['integrations'];

  // retrieving the list of integrations from the fleet plugin's endpoint
  const fetchIntegrations = () => http.get<IntegrationResponse>(INTEGRATIONS_URL);

  const query = useQuery(queryKey, fetchIntegrations, {
    select: (data: IntegrationResponse) => (data ? filterIntegrations(data.items) : []),
  });

  const queryClient = useQueryClient();

  // cancel slow integrations call to unblock the UI
  setTimeout(() => queryClient.cancelQueries(queryKey), INTEGRATIONS_CALL_TIMEOUT);

  return query;
};
