/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LegacyEndpointEvent,
  ResolverEvent,
  SafeResolverEvent,
  ECSField,
  WinlogEvent,
} from '../types';
import { firstNonNullValue, hasValue, values } from './ecs_safety_helpers';

/**
 * Legacy events will define the `endgame` object. This is used to narrow a ResolverEvent.
 */
interface LegacyEvent {
  endgame?: object;
}

/*
 * Determine if a higher level event type is the legacy variety. Can be used to narrow an event type.
 * T optionally defines an `endgame` object field used for determining the type of event. If T doesn't contain the
 * `endgame` field it will serve as the narrowed type.
 */
export function isLegacyEventSafeVersion<T extends LegacyEvent>(
  event: LegacyEvent | {}
): event is T {
  return 'endgame' in event && event.endgame !== undefined;
}

/*
 * Determine if a `ResolverEvent` is the legacy variety. Can be used to narrow `ResolverEvent` to `LegacyEndpointEvent`. See `isLegacyEventSafeVersion`
 */
export function isLegacyEvent(event: ResolverEvent): event is LegacyEndpointEvent {
  return (event as LegacyEndpointEvent).endgame !== undefined;
}

/**
 * Minimum fields needed from the `SafeResolverEvent` type for the function below to operate correctly.
 */
type ProcessRunningFields = Partial<
  | {
      endgame: object;
      event: Partial<{
        type: ECSField<string>;
        action: ECSField<string>;
      }>;
    }
  | {
      event: Partial<{
        type: ECSField<string>;
      }>;
    }
>;

/**
 * Checks if an event describes a process as running (whether it was started, already running, or changed)
 *
 * @param event a document to check for running fields
 */
export function isProcessRunning(event: ProcessRunningFields): boolean {
  if (isLegacyEventSafeVersion(event)) {
    return (
      hasValue(event.event?.type, 'process_start') ||
      hasValue(event.event?.action, 'fork_event') ||
      hasValue(event.event?.type, 'already_running')
    );
  }

  return (
    hasValue(event.event?.type, 'start') ||
    hasValue(event.event?.type, 'change') ||
    hasValue(event.event?.type, 'info')
  );
}

/**
 * Minimum fields needed from the `SafeResolverEvent` type for the function below to operate correctly.
 */
type TimestampFields = Pick<SafeResolverEvent, '@timestamp'>;

/**
 * Extracts the first non null value from the `@timestamp` field in the document. Returns undefined if the field doesn't
 * exist in the document.
 *
 * @param event a document from ES
 */
export function timestampSafeVersion(event: TimestampFields): undefined | number {
  return firstNonNullValue(event?.['@timestamp']);
}

/**
 * The `@timestamp` for the event, as a `Date` object.
 * If `@timestamp` couldn't be parsed as a `Date`, returns `undefined`.
 */
export function timestampAsDateSafeVersion(event: TimestampFields): Date | undefined {
  const value = timestampSafeVersion(event);
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(value);
  // Check if the date is valid
  if (isFinite(date.getTime())) {
    return date;
  } else {
    return undefined;
  }
}

/**
 * The @timestamp ECS field
 */
export function eventTimestamp(event: SafeResolverEvent): string | undefined | number {
  return firstNonNullValue(event['@timestamp']);
}

/**
 * Find the name of the related process.
 */
export function processName(event: ResolverEvent): string {
  if (isLegacyEvent(event)) {
    return event.endgame.process_name ? event.endgame.process_name : '';
  } else {
    return event.process.name;
  }
}

/**
 * First non-null value in the `user.name` field.
 */
export function userName(event: SafeResolverEvent): string | undefined {
  if (isLegacyEventSafeVersion(event)) {
    return undefined;
  } else {
    return firstNonNullValue(event.user?.name);
  }
}

/**
 * Returns the process event's parent PID
 */
export function parentPID(event: SafeResolverEvent): number | undefined {
  return firstNonNullValue(
    isLegacyEventSafeVersion(event) ? event.endgame.ppid : event.process?.parent?.pid
  );
}

/**
 * First non-null value for the `process.hash.md5` field.
 */
export function md5HashForProcess(event: SafeResolverEvent): string | undefined {
  return firstNonNullValue(isLegacyEventSafeVersion(event) ? undefined : event.process?.hash?.md5);
}

/**
 * First non-null value for the `event.process.args` field.
 */
export function argsForProcess(event: SafeResolverEvent): string[] | undefined {
  if (isLegacyEventSafeVersion(event)) {
    // There is not currently a key for this on Legacy event types
    return undefined;
  }
  return values(event.process?.args);
}

/**
 * First non-null value in the `user.name` field.
 */
export function userDomain(event: SafeResolverEvent): string | undefined {
  if (isLegacyEventSafeVersion(event)) {
    return undefined;
  } else {
    return firstNonNullValue(event.user?.domain);
  }
}

/**
 * Find the name of the related process.
 */
export function processNameSafeVersion(event: SafeResolverEvent): string | undefined {
  if (isLegacyEventSafeVersion(event)) {
    return firstNonNullValue(event.endgame.process_name);
  } else {
    return firstNonNullValue(event.process?.name);
  }
}

export function eventID(event: SafeResolverEvent): number | undefined | string {
  if (isLegacyEventSafeVersion(event)) {
    return firstNonNullValue(event.endgame?.serial_event_id);
  } else {
    return firstNonNullValue(event.event?.id);
  }
}

export function documentID(event: SafeResolverEvent): undefined | string {
  return firstNonNullValue(event._id);
}

export function indexName(event: SafeResolverEvent): string | undefined {
  return firstNonNullValue(event._index);
}

/**
 * Retrieve the record_id field from a winlog event.
 *
 * @param event a winlog event
 */
export function winlogRecordID(event: WinlogEvent): undefined | string {
  return firstNonNullValue(event.winlog?.record_id);
}

/**
 * The event.id ECS field.
 */
export function eventIDSafeVersion(event: SafeResolverEvent): number | undefined | string {
  return firstNonNullValue(
    isLegacyEventSafeVersion(event) ? event.endgame?.serial_event_id : event.event?.id
  );
}

/**
 * The event.entity_id field.
 */
export function entityId(event: SafeResolverEvent): string | undefined {
  if (isLegacyEventSafeVersion(event)) {
    return event.endgame.unique_pid ? String(event.endgame.unique_pid) : '';
  }
  return firstNonNullValue(event.process?.entity_id);
}

/**
 * Minimum fields needed from the `SafeResolverEvent` type for the function below to operate correctly.
 */
type EntityIDFields = Partial<
  | {
      endgame: Partial<{
        unique_pid: ECSField<number>;
      }>;
    }
  | {
      process: Partial<{
        entity_id: ECSField<string>;
      }>;
    }
>;

/**
 * Extract the first non null value from either the `entity_id` or `unique_pid` depending on the document type. Returns
 * undefined if the field doesn't exist in the document.
 *
 * @param event a document from ES
 */
export function entityIDSafeVersion(event: EntityIDFields): string | undefined {
  if (isLegacyEventSafeVersion(event)) {
    return event.endgame?.unique_pid === undefined
      ? undefined
      : String(firstNonNullValue(event.endgame.unique_pid));
  } else {
    return firstNonNullValue(event.process?.entity_id);
  }
}

/**
 * Minimum fields needed from the `SafeResolverEvent` type for the function below to operate correctly.
 */
type ParentEntityIDFields = Partial<
  | {
      endgame: Partial<{
        unique_ppid: ECSField<number>;
      }>;
    }
  | {
      process: Partial<{
        parent: Partial<{
          entity_id: ECSField<string>;
        }>;
      }>;
    }
>;

/**
 * Extract the first non null value from either the `parent.entity_id` or `unique_ppid` depending on the document type. Returns
 * undefined if the field doesn't exist in the document.
 *
 * @param event a document from ES
 */
export function parentEntityIDSafeVersion(event: ParentEntityIDFields): string | undefined {
  if (isLegacyEventSafeVersion(event)) {
    return String(firstNonNullValue(event.endgame?.unique_ppid));
  }
  return firstNonNullValue(event.process?.parent?.entity_id);
}

/**
 * Minimum fields needed from the `SafeResolverEvent` type for the function below to operate correctly.
 */
type AncestryArrayFields = Partial<
  | {
      endgame: object;
    }
  | {
      process: Partial<{
        Ext: Partial<{
          ancestry: ECSField<string>;
        }>;
      }>;
    }
>;

/**
 * Extracts all ancestry array from a document if it exists.
 *
 * @param event an ES document
 */
export function ancestryArray(event: AncestryArrayFields): string[] | undefined {
  if (isLegacyEventSafeVersion(event)) {
    return undefined;
  }
  // this is to guard against the endpoint accidentally not sending the ancestry array
  // otherwise the request will fail when really we should just try using the parent entity id
  return values(event.process?.Ext?.ancestry);
}

/**
 * Minimum fields needed from the `SafeResolverEvent` type for the function below to operate correctly.
 */
type AncestryFields = AncestryArrayFields & ParentEntityIDFields;

/**
 * Returns an array of strings representing the ancestry for a process.
 *
 * @param event an ES document
 */
export function ancestry(event: AncestryFields): string[] {
  const ancestors = ancestryArray(event);
  if (ancestors) {
    return ancestors;
  }

  const parentID = parentEntityIDSafeVersion(event);
  if (parentID) {
    return [parentID];
  }

  return [];
}

/**
 * @param event The event to get the full ECS category for
 */
export function eventCategory(event: SafeResolverEvent): string[] {
  return values(
    isLegacyEventSafeVersion(event) ? event.endgame.event_type_full : event.event?.category
  );
}

/**
 * ECS event type will be things like 'creation', 'deletion', 'access', etc.
 * see: https://www.elastic.co/guide/en/ecs/current/ecs-event.html
 * @param event The ResolverEvent to get the ecs type for
 */
export function eventType(event: SafeResolverEvent): string[] {
  return values(
    isLegacyEventSafeVersion(event) ? event.endgame.event_subtype_full : event.event?.type
  );
}

/**
 * event.kind as an array.
 */
export function eventKind(event: SafeResolverEvent): string[] {
  if (isLegacyEventSafeVersion(event)) {
    return [];
  } else {
    return values(event.event?.kind);
  }
}
