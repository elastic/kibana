/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { countBy } from 'lodash';
import { SavedObjectAttributes } from 'src/legacy/server/saved_objects/service/saved_objects_client';
import { isAgentName } from '../../../common/agent_name';
import { getSavedObjectsClient } from '../helpers/saved_objects_client';

export const APM_TELEMETRY_DOC_ID = 'apm-telemetry';

export function createApmTelementry(
  agentNames: string[] = []
): SavedObjectAttributes {
  const validAgentNames = agentNames.filter(isAgentName);
  return {
    has_any_services: validAgentNames.length > 0,
    services_per_agent: countBy(validAgentNames)
  };
}

export function storeApmTelemetry(
  server: Server,
  apmTelemetry: SavedObjectAttributes
): void {
  const savedObjectsClient = getSavedObjectsClient(server);
  savedObjectsClient.create('apm-telemetry', apmTelemetry, {
    id: APM_TELEMETRY_DOC_ID,
    overwrite: true
  });
}
