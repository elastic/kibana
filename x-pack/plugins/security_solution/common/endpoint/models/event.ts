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

export function ancestryArray(event: ResolverEvent): string[] | undefined {
  if (isLegacyEvent(event)) {
    return undefined;
  }
  return event.process.Ext.ancestry;
}

export function getAncestryAsArray(event: ResolverEvent | undefined): string[] {
  if (!event) {
    return [];
  }

  const ancestors = ancestryArray(event);
  if (ancestors) {
    return ancestors;
  }

  const parentID = parentEntityId(event);
  if (parentID) {
    return [parentID];
  }

  return [];
}

/**
 * @param event The event to get the category for
 */
export function primaryEventCategory(event: ResolverEvent): string | undefined {
  // Returning "Process" as a catch-all here because it seems pretty general
  if (isLegacyEvent(event)) {
    const legacyFullType = event.endgame.event_type_full;
    if (legacyFullType) {
      return legacyFullType;
    }
  } else {
    const eventCategories = event.event.category;
    const category = typeof eventCategories === 'string' ? eventCategories : eventCategories[0];

    return category;
  }
}

/**
 * ECS event type will be things like 'creation', 'deletion', 'access', etc.
 * see: https://www.elastic.co/guide/en/ecs/current/ecs-event.html
 * @param event The ResolverEvent to get the ecs type for
 */
export function ecsEventType(event: ResolverEvent): Array<string | undefined> {
  if (isLegacyEvent(event)) {
    return [event.endgame.event_subtype_full];
  }
  return typeof event.event.type === 'string' ? [event.event.type] : event.event.type;
}

/**
 * #Descriptive Names For Related Events:
 *
 * The following section provides facilities for deriving **Descriptive Names** for ECS-compliant event data.
 * There are drawbacks to trying to do this: It *will* require ongoing maintenance. It presents temptations to overarticulate.
 * On balance, however, it seems that the benefit of giving the user some form of information they can recognize & scan outweighs the drawbacks.
 */
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
/**
 * Based on the ECS category of the event, attempt to provide a more descriptive name
 * (e.g. the `event.registry.key` for `registry` or the `dns.question.name` for `dns`, etc.).
 * This function returns the data in the form of `{subject, descriptor}` where `subject` will
 * tend to be the more distinctive term (e.g. 137.213.212.7 for a network event) and the
 * `descriptor` can be used to present more useful/meaningful view (e.g. `inbound 137.213.212.7`
 * in the example above).
 * see: https://www.elastic.co/guide/en/ecs/current/ecs-field-reference.html
 * @param event The ResolverEvent to get the descriptive name for
 * @returns { descriptiveName } An attempt at providing a readable name to the user
 */
export function descriptiveName(event: ResolverEvent): { subject: string; descriptor?: string } {
  if (isLegacyEvent(event)) {
    return { subject: eventName(event) };
  }

  // To be somewhat defensive, we'll check for the presence of these.
  const partialEvent: DeepPartial<ResolverEvent> = event;

  /**
   * This list of attempts can be expanded/adjusted as the underlying model changes over time:
   */

  // Stable, per ECS 1.5: https://www.elastic.co/guide/en/ecs/current/ecs-allowed-values-event-category.html

  if (partialEvent.network?.forwarded_ip) {
    return {
      subject: String(partialEvent.network?.forwarded_ip),
      descriptor: String(partialEvent.network?.direction),
    };
  }

  if (partialEvent.file?.path) {
    return {
      subject: String(partialEvent.file?.path),
    };
  }

  // Extended categories (per ECS 1.5):
  const pathOrKey = partialEvent.registry?.path || partialEvent.registry?.key;
  if (pathOrKey) {
    return {
      subject: String(pathOrKey),
    };
  }

  if (partialEvent.dns?.question?.name) {
    return { subject: String(partialEvent.dns?.question?.name) };
  }

  // Fall back on entityId if we can't fish a more descriptive name out.
  return { subject: entityId(event) };
}
