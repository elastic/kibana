/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LegacyEndpointEvent, ResolverEvent, SafeResolverEvent, ECSField } from '../types';
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

export function eventTimestamp(event: ResolverEvent): string | undefined | number {
  return event['@timestamp'];
}

export function eventName(event: ResolverEvent): string {
  if (isLegacyEvent(event)) {
    return event.endgame.process_name ? event.endgame.process_name : '';
  } else {
    return event.process.name;
  }
}

export function processNameSafeVersion(event: SafeResolverEvent): string | undefined {
  if (isLegacyEventSafeVersion(event)) {
    return firstNonNullValue(event.endgame.process_name);
  } else {
    return firstNonNullValue(event.process?.name);
  }
}

export function eventId(event: ResolverEvent): number | undefined | string {
  if (isLegacyEvent(event)) {
    return event.endgame.serial_event_id;
  }
  return event.event.id;
}

/**
 * Minimum fields needed from the `SafeResolverEvent` type for the function below to operate correctly.
 */
type EventSequenceFields = Partial<
  | {
      endgame: Partial<{
        serial_event_id: ECSField<number>;
      }>;
    }
  | {
      event: Partial<{
        sequence: ECSField<number>;
      }>;
    }
>;

/**
 * Extract the first non null event sequence value from a document. Returns undefined if the field doesn't exist in the document.
 *
 * @param event a document from ES
 */
export function eventSequence(event: EventSequenceFields): number | undefined {
  if (isLegacyEventSafeVersion(event)) {
    return firstNonNullValue(event.endgame?.serial_event_id);
  }
  return firstNonNullValue(event.event?.sequence);
}

export function eventIDSafeVersion(event: SafeResolverEvent): number | undefined | string {
  return firstNonNullValue(
    isLegacyEventSafeVersion(event) ? event.endgame?.serial_event_id : event.event?.id
  );
}

export function entityId(event: ResolverEvent): string {
  if (isLegacyEvent(event)) {
    return event.endgame.unique_pid ? String(event.endgame.unique_pid) : '';
  }
  return event.process.entity_id;
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

export function parentEntityId(event: ResolverEvent): string | undefined {
  if (isLegacyEvent(event)) {
    return event.endgame.unique_ppid ? String(event.endgame.unique_ppid) : undefined;
  }
  return event.process.parent?.entity_id;
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
type GetAncestryArrayFields = AncestryArrayFields & ParentEntityIDFields;

/**
 * Returns an array of strings representing the ancestry for a process.
 *
 * @param event an ES document
 */
export function getAncestryAsArray(event: GetAncestryArrayFields | undefined): string[] {
  if (!event) {
    return [];
  }

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
 * @param event The event to get the category for
 */
export function primaryEventCategory(event: ResolverEvent): string | undefined {
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
 * @param event The event to get the full ECS category for
 */
export function allEventCategories(event: ResolverEvent): string | string[] | undefined {
  if (isLegacyEvent(event)) {
    const legacyFullType = event.endgame.event_type_full;
    if (legacyFullType) {
      return legacyFullType;
    }
  } else {
    return event.event.category;
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
