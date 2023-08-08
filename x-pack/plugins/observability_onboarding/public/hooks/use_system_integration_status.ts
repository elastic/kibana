/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from './use_kibana';

export const SYSTEM_INTEGRATION_URL = '/api/fleet/epm/packages/system';
export const SYSTEM_INTEGRATION_STATUS_QUERY_KEY = ['system-integration'];

type IntegrationInstallStatus =
  | 'installed'
  | 'installing'
  | 'install_failed'
  | 'not_installed';

const INTEGRATIONS_CALL_TIMEOUT = 2000;

export interface IntegrationResponse {
  item: {
    version: string;
    status: IntegrationInstallStatus;
  };
}

/**
 * Retrieves system integration from the Fleet plugin endpoint /api/fleet/epm/packages.
 * We cancel the query in case it's taking too long to not block the Indicators page for the user.
 */
export const useSystemIntegrationStatus = () => {
  const { http } = useKibana().services;

  const fetchSystemIntegration = () =>
    http.get<IntegrationResponse>(SYSTEM_INTEGRATION_URL);

  const query = useQuery(
    SYSTEM_INTEGRATION_STATUS_QUERY_KEY,
    fetchSystemIntegration
  );

  const queryClient = useQueryClient();

  // cancel slow integrations call to unblock the UI
  setTimeout(
    () => queryClient.cancelQueries(SYSTEM_INTEGRATION_STATUS_QUERY_KEY),
    INTEGRATIONS_CALL_TIMEOUT
  );

  return { status: query.status, data: query.data?.item };
};
