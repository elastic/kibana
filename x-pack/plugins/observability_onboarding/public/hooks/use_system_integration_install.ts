/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKibana } from './use_kibana';
import {
  SYSTEM_INTEGRATION_STATUS_QUERY_KEY,
  SYSTEM_INTEGRATION_URL,
} from './use_system_integration_status';

const SYSTEM_INTEGRATION_INSTALL_MUTATION_KEY = ['system-integration-install'];

export const useSystemIntegrationInstall = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const installSystemIntegration = (version: string) =>
    http.post(`${SYSTEM_INTEGRATION_URL}/${version}`);

  return useMutation(installSystemIntegration, {
    mutationKey: SYSTEM_INTEGRATION_INSTALL_MUTATION_KEY,
    onSettled: (_) => {
      queryClient.invalidateQueries({
        queryKey: SYSTEM_INTEGRATION_STATUS_QUERY_KEY,
      });
    },
  });
};
