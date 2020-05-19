/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LegacyEndpointEvent, ResolverEvent } from '../types';

export function isLegacyEvent(event: ResolverEvent): event is LegacyEndpointEvent {
  return (event as LegacyEndpointEvent).endgame !== undefined;
}

export function isProcessStart(event: ResolverEvent): boolean {
  if (isLegacyEvent(event)) {
    return event.event?.type === 'process_start' || event.event?.action === 'fork_event';
  }
  return event.event.type === 'start';
}

export function eventTimestamp(event: ResolverEvent): string | undefined | number {
  if (isLegacyEvent(event)) {
    return event.endgame.timestamp_utc;
  } else {
    return event['@timestamp'];
  }
}

export function eventName(event: ResolverEvent): string {
  if (isLegacyEvent(event)) {
    return event.endgame.process_name ? event.endgame.process_name : '';
  } else {
    return event.process.name;
  }
}

export function eventId(event: ResolverEvent): string {
  if (isLegacyEvent(event)) {
    return event.endgame.serial_event_id ? String(event.endgame.serial_event_id) : '';
  }
  return event.event.id;
}

export function entityId(event: ResolverEvent): string {
  if (isLegacyEvent(event)) {
    return event.endgame.unique_pid ? String(event.endgame.unique_pid) : '';
  }
  return event.process.entity_id;
}

export function parentEntityId(event: ResolverEvent): string | undefined {
  if (isLegacyEvent(event)) {
    return event.endgame.unique_ppid ? String(event.endgame.unique_ppid) : undefined;
  }
  return event.process.parent?.entity_id;
}

export function eventType(event: ResolverEvent): string {
  // Returning "Process" as a catch-all here because it seems pretty general
  let eventCategoryToReturn: string = 'Process';
  if (isLegacyEvent(event)) {
    const legacyFullType = event.endgame.event_type_full;
    if (legacyFullType) {
      return legacyFullType;
    }
  } else {
    const eventCategories = event.event.category;
    const eventCategory =
      typeof eventCategories === 'string' ? eventCategories : eventCategories[0] || '';

    if (eventCategory) {
      eventCategoryToReturn = eventCategory;
    }
  }
  return eventCategoryToReturn;
}
