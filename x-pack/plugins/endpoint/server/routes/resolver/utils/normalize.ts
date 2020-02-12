/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { splitN } from './common';

const LEGACY_ENTITY_PREFIX = 'endgame-';
const LEGACY_ENTITY_DELIMITER = '-';

function isLegacyData(data: ResolverEvent): data is LegacyEndpointEvent {
  return data.agent.type === 'endgame';
}

export function extractEventID(event: ResolverEvent) {
  if (isLegacyData(event)) {
    return event.endgame.serial_event_id;
  }
  return event.event.id;
}

export function extractEntityID(event: ResolverEvent) {
  if (isLegacyData(event)) {
    return event.endgame.unique_pid;
  }
  return event.endpoint.process.entity_id;
}

export function parseLegacyEntityID(
  entityID: string
): { endpointID: string; uniquePID: string } | null {
  if (!entityID.startsWith(LEGACY_ENTITY_PREFIX)) {
    return null;
  }
  const fields = splitN(entityID, LEGACY_ENTITY_DELIMITER, 2);
  if (fields.length !== 3) {
    return null;
  }
  return { endpointID: fields[2], uniquePID: fields[1] };
}
