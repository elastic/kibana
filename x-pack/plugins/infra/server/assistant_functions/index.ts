/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { IScopedSearchClient } from '@kbn/data-plugin/server';
import {
  ChatRegistrationFunction,
  RegisterFunction,
} from '@kbn/observability-ai-assistant-plugin/server/service/types';
import { InfraBackendLibs } from '../lib/infra_types';
import { registerGetInfraInventoryListFunction } from './get_infra_inventory_list';

export interface FunctionRegistrationParameters {
  libs: InfraBackendLibs;
  registerFunction: RegisterFunction;
  soClient: SavedObjectsClientContract;
  searchClient: IScopedSearchClient;
}

export function registerAssistantFunctions(libs: InfraBackendLibs): ChatRegistrationFunction {
  return async ({ resources, registerContext, registerFunction }) => {
    const [coreStart, { data }] = await libs.getStartServices();
    const soClient = coreStart.savedObjects.getScopedClient(resources.request);

    const searchClient = data.search.asScoped(resources.request);

    registerGetInfraInventoryListFunction({
      libs,
      registerFunction,
      soClient,
      searchClient,
    });

    registerContext({
      name: 'infrastructure',
      description: `
      When analyzing Infrastructure data, prefer the Infrastructure specific functions over the generic Lens,
      Elasticsearch, APM, Observability or Kibana ones, unless those are explicitly requested by the user.

      Infrastrucutre includes: host(s), container(s), kubernetes.

      When requesting metrics for an Infrastructure Asset, make sure you also know what is the service name.

      There is an important fields in Infrastructure:
      - host.name: the name of the host

      Hosts have following metrics: 
      - cpu (percentage), 
      - disk space usage (percentage), 
      - memory (percentage), 
      - normalized load for 1m (percentage), 
      - rx (in bits/second. Format it to bytes/second), 
      - tx (in bits/scond. Format it to bytes/second).

      For the metrics analysis, you will use the Saturation indicator from the SRE Golden Signals. Saturation, also known as "utilization," 
      measures the capacity or usage level of resources in the system. It helps ensure that resources are not overly utilized, leading to performance degradation or outages.

      Your task is to help users determine the root cause of an issue quickly and transparently.
      If you see a saturatin in any host, correlate that with other hosts you already know the metrics of help users determine the problem. 
      You will list only the metrics that have problems.
  `,
    });
  };
}
