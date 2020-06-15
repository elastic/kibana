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

/**
 * @param event The event to get the category for
 */
export function eventCategory(event: ResolverEvent): string {
  // Returning "Process" as a catch-all here because it seems pretty general
  let eventCategoryToReturn: string = 'Process';
  if (isLegacyEvent(event)) {
    const legacyFullType = event.endgame.event_type_full;
    if (legacyFullType) {
      return legacyFullType;
    }
  } else {
    const eventCategories = event.event.category;
    const category =
      typeof eventCategories === 'string' ? eventCategories : eventCategories[0] || '';

    if (category) {
      eventCategoryToReturn = category;
    }
  }
  return eventCategoryToReturn;
}

/**
 * ECS event type will be things like 'creation', 'deletion', 'access', etc.
 * see: https://www.elastic.co/guide/en/ecs/current/ecs-event.html
 * @param event The ResolverEvent to get the ecs type for
 */
export function ecsEventType(event: ResolverEvent): string {
  if (isLegacyEvent(event)) {
    return event.endgame.event_subtype_full || '';
  }
  return typeof event.event.type === 'string' ? event.event.type : event.event.type.join('/');
}

/**
 * #Descriptive Names For Related Events:
 *
 * The following section provides facilities for deriving **Descriptive Names** for ECS-compliant event data.
 * There are drawbacks to trying to do this: It *will* require ongoing maintenance. It presents temptations to overarticulate.
 * On balance, however, it seems that the benefit of giving the user some form of information they can recognize & scan outweighs the drawbacks.
 */

/**
 * A type that annotates the basic requirements for giving the event a `descriptive name`
 */
type detailRecord<T> = T extends 'registry'
  ? { path: unknown; key: unknown }
  : T extends 'dns'
  ? { question: { name: unknown } }
  : T extends 'network'
  ? { direction: unknown; forwarded_ip: unknown }
  : T extends 'file'
  ? { path: unknown }
  : unknown;
type ecsRecordWithType<T extends string> = Record<T, detailRecord<T>>;

/**
 * Verify that the `ecsCategory` exists as a key on the event record. i.e. if ecsCategory is `registry`, the event is shaped like {registry: object}
 *
 * @param event
 * @param ecsCategory
 */
export function isRecordNamable<T extends string>(
  event: object,
  ecsCategory: T
): event is ecsRecordWithType<T> {
  // The goal here is to reach in and grab a better name for the event (if one exists) without being too obtrusive/assertive about ECS
  return typeof (event as ecsRecordWithType<T>)[ecsCategory] === 'object';
}

/**
 * Based on the ECS category of the event, attempt to provide a more descriptive name
 * (e.g. the `event.registry.key` for `registry` or the `dns.question.name` for `dns`, etc.).
 * see: https://www.elastic.co/guide/en/ecs/current/ecs-field-reference.html
 * @param event The ResolverEvent to get the descriptive name for
 * @returns { descriptiveName } An attempt at providing a readable name to the user
 */
export function descriptiveName(event: ResolverEvent): string {
  if (isLegacyEvent(event)) {
    return eventName(event);
  }
  // For the purposes of providing a descriptive name, we're taking the first entry in the `event.type`
  const ecsCategory = eventCategory(event);

  /**
   * This list of attempts can be expanded/adjusted as the underlying model changes over time:
   */

  // Stable, per ECS 1.5: https://www.elastic.co/guide/en/ecs/current/ecs-allowed-values-event-category.html
  if (ecsCategory === 'network' && isRecordNamable(event, ecsCategory)) {
    if (event?.network?.forwarded_ip) {
      return `${event?.network?.direction ? `${event?.network?.direction} ` : ''}${
        event.network.forwarded_ip
      }`;
    }
  }
  if (ecsCategory === 'file' && isRecordNamable(event, ecsCategory)) {
    if (event?.file?.path) {
      return `${event.file.path}`;
    }
  }

  // Extended categories (per ECS 1.5):
  if (ecsCategory === 'registry' && isRecordNamable(event, ecsCategory)) {
    const pathOrKey = event?.registry?.path || event?.registry?.key;
    if (pathOrKey) {
      return `${pathOrKey}`;
    }
  }
  if (ecsCategory === 'dns' && isRecordNamable(event, ecsCategory)) {
    if (event?.dns?.question?.name) {
      return `${event.dns.question.name}`;
    }
  }

  // Fall back on entityId if we can't fish a more descriptive name out.
  return entityId(event);
}
