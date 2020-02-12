/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { splitN } from './common';
import { ResolverEvent, LegacyEndpointEvent } from '../../../../common/types';

const LEGACY_ENTITY_PREFIX = 'endgame-';
const LEGACY_ENTITY_DELIMITER = '-';

function isLegacyData(data: ResolverEvent): data is LegacyEndpointEvent {
  return data.agent.type === 'endgame';
}

export function extractEventID(event: ResolverEvent) {
  if (isLegacyData(event)) {
    return String(event.endgame.serial_event_id);
  }
  return event.event.id;
}

export function extractEntityID(event: ResolverEvent) {
  if (isLegacyData(event)) {
    return String(event.endgame.unique_pid);
  }
  return event.endpoint.process.entity_id;
}

export function extractUniqueID(entityID: string) {
  const parsedEntityID = parseLegacyEntityID(entityID);
  return parsedEntityID === null ? entityID : parsedEntityID.uniquePID;
}

export function getParentEntityID(events: ResolverEvent[]) {
  if (events.length === 0) {
    return undefined;
  }
  const event = events[0];
  if (isLegacyData(event)) {
    const uniquePPID = event.endgame?.unique_ppid;
    return uniquePPID
      ? LEGACY_ENTITY_PREFIX + uniquePPID + LEGACY_ENTITY_DELIMITER + event.agent.id
      : undefined;
  }
  return event.endpoint.process?.parent?.entity_id;
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
