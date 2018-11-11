/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

// Support telemetry for additional agent types by appending definitions in
// mappings.json and the AgentName enum.

export enum AgentName {
  Python = 'python',
  Java = 'java',
  NodeJs = 'nodejs',
  JsBase = 'js-base',
  Ruby = 'ruby',
  GoLang = 'go'
}

export interface ApmTelemetry {
  has_any_services: boolean;
  services_per_agent: { [agentName in AgentName]: number };
}

export const APM_TELEMETRY_DOC_ID = 'apm-telemetry';

export function createApmTelementry(
  agentNames: AgentName[] = []
): ApmTelemetry {
  return agentNames.reduce(
    (apmTelemetry, agentName) => {
      if (agentName && Object.values(AgentName).includes(agentName)) {
        apmTelemetry.has_any_services = true;
        apmTelemetry.services_per_agent[agentName]++;
      }
      return apmTelemetry;
    },
    {
      has_any_services: false,
      services_per_agent: Object.values(AgentName).reduce(
        (memo, agentName: AgentName) => Object.assign(memo, { [agentName]: 0 }),
        {}
      )
    } as ApmTelemetry
  );
}

export function storeApmTelemetry(
  server: Server,
  apmTelemetry: ApmTelemetry
): void {
  const savedObjectsClient = getSavedObjectsClient(server);
  savedObjectsClient.create('apm-telemetry', apmTelemetry, {
    id: APM_TELEMETRY_DOC_ID,
    overwrite: true
  });
}

export function getSavedObjectsClient(server: Server): any {
  const {
    savedObjects: { SavedObjectsClient, getSavedObjectsRepository }
  } = server;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster(
    'admin'
  );
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);
  return new SavedObjectsClient(internalRepository);
}
