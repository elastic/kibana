/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import {
  PluginContractResolver,
  FoundPluginContractResolverResponseItem,
} from '@kbn/core-plugins-contracts-browser';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from './use_kibana';

// this is only a part of UpsellingService, which is included in the exported contract of securitySolution
// the full class can be found in x-pack/plugins/security_solution/upselling/service/upselling_service.ts
interface UpsellingServiceInterface {
  sections: Map<string, ComponentType>;
  pages: Map<string, ComponentType>;
  messages: Map<string, string>;
}

interface SecuritySolutionContract {
  getUpselling: () => UpsellingServiceInterface;
}

const CSP_UPSELLING_SERVICES_KEY = 'csp-upselling-services-key';

export const fetchUpsellingService = async (pluginsOnStart: PluginContractResolver) => {
  const pluginResult = await pluginsOnStart('securitySolution');

  if (pluginResult?.securitySolution?.found) {
    const securitySolution =
      pluginResult.securitySolution as FoundPluginContractResolverResponseItem<SecuritySolutionContract>;
    return securitySolution.contract.getUpselling();
  }
};

export const useServerlessServices = (pluginsOnStart?: PluginContractResolver) => {
  const { cloud, plugins } = useKibana().services;
  const isServerless = !!cloud?.serverless?.projectType;

  const { data: upsellingService } = useQuery({
    queryKey: [CSP_UPSELLING_SERVICES_KEY],
    queryFn: () => fetchUpsellingService(pluginsOnStart || plugins.onStart),
    enabled: isServerless,
  });

  return { upsellingService, isServerless };
};
