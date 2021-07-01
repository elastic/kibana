/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from '@commercial/hapi';
import { countBy } from 'lodash';

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
  services_per_agent: { [agentName in AgentName]?: number };
}

export const APM_TELEMETRY_DOC_ID = 'apm-telemetry';

export function createApmTelementry(
  agentNames: AgentName[] = []
): ApmTelemetry {
  const validAgentNames = agentNames.filter(agentName =>
    Object.values(AgentName).includes(agentName)
  );
  return {
    has_any_services: validAgentNames.length > 0,
    services_per_agent: countBy(validAgentNames)
  };
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
  const { SavedObjectsClient, getSavedObjectsRepository } = server.savedObjects;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster(
    'admin'
  );
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);
  return new SavedObjectsClient(internalRepository);
}
