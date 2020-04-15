/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointEvent, LegacyEndpointEvent, ResolverEvent } from '../types';

export function isLegacyEvent(
  event: EndpointEvent | LegacyEndpointEvent
): event is LegacyEndpointEvent {
  return (event as LegacyEndpointEvent).endgame !== undefined;
}

export function eventTimestamp(
  event: EndpointEvent | LegacyEndpointEvent
): string | undefined | number {
  if (isLegacyEvent(event)) {
    return event.endgame.timestamp_utc;
  } else {
    return event['@timestamp'];
  }
}

/** TODO, seems wrong */
export function eventName(event: EndpointEvent | LegacyEndpointEvent): string {
  if (isLegacyEvent(event)) {
    return event.endgame.process_name ? event.endgame.process_name : '';
  } else {
    return event.process.name;
  }
}

export function eventId(event: ResolverEvent) {
  if (isLegacyEvent(event)) {
    return String(event.endgame.serial_event_id);
  }
  return event.event.id;
}

export function entityId(event: ResolverEvent) {
  if (isLegacyEvent(event)) {
    return String(event.endgame.unique_pid);
  }
  return event.process.entity_id;
}

export function parentEntityId(event: ResolverEvent) {
  if (isLegacyEvent(event)) {
    const ppid = event.endgame.unique_ppid;
    return String(ppid); // if unique_ppid is undefined return undefined
  }
  return event.process.parent?.entity_id;
}
