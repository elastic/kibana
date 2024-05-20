/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginContractResolver,
  FoundPluginContractResolverResponseItem,
} from '@kbn/core-plugins-contracts-browser';
import { useQuery } from '@tanstack/react-query'; // Importing React Query
import { useKibana } from './use_kibana';

// this is a simplified version of the UpsellingService, which is part of the exported contract of securitySolution
// the full class can be found in x-pack/plugins/security_solution/upselling/service/upselling_service.ts
interface UpsellingServiceInterface {
  sections: Map<string, React.ComponentType>;
  pages: Map<string, React.ComponentType>;
  messages: Map<string, string>;
}

interface SecuritySolutionContract {
  getUpselling: () => UpsellingServiceInterface; // Update 'any' to the actual return type of getUpselling
  // Define other methods or properties of your contract here
}

const CSP_UPSELLING_SERVICES_KEY = 'csp-upselling-services-key';

const fetchUpsellingService = async (pluginsOnStart: PluginContractResolver) => {
  const pluginResult = await pluginsOnStart('securitySolution');

  if (pluginResult?.securitySolution?.found) {
    const securitySolution =
      pluginResult.securitySolution as FoundPluginContractResolverResponseItem<SecuritySolutionContract>;
    return securitySolution.contract.getUpselling();
  }
};

export const useServerlessServices = (pluginsOnStart: PluginContractResolver) => {
  const { cloud } = useKibana().services;
  const isServerless = !!cloud.serverless?.projectType;

  const { data: upsellingService } = useQuery({
    queryKey: [CSP_UPSELLING_SERVICES_KEY],
    queryFn: () => fetchUpsellingService(pluginsOnStart),
    enabled: isServerless,
  });

  return { upsellingService, isServerless };
};
