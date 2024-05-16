/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { PluginContractResolver } from '@kbn/core-plugins-contracts-browser';
import { useKibana } from './use_kibana';

const CSP_UPSELLING_SERVICES_KEY = 'csp-upselling-services-key';

const fetchUpsellingService = async (pluginsOnStart: PluginContractResolver) => {
  const securitySolutionPluginOnStart = await pluginsOnStart('securitySolution');
  return securitySolutionPluginOnStart.securitySolution?.contract.getUpselling();
};

export const useServerlessServices = (pluginsOnStart: PluginContractResolver) => {
  const { cloud } = useKibana().services;
  const isServerless = !!cloud.serverless.projectType;

  const {
    data: upsellingService,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [CSP_UPSELLING_SERVICES_KEY],
    queryFn: () => fetchUpsellingService(pluginsOnStart),
    options: {
      enabled: isServerless, // Only fetch when isServerless is true
    },
  });

  return { upsellingService, isLoading, isError, isServerless };
};
