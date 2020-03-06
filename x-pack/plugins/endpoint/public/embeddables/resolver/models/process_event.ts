/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isLegacyEvent, ResolverEvent } from '../../../../common/types';

/**
 * Returns true if the process's eventType is either 'processCreated' or 'processRan'.
 * Resolver will only render 'graphable' process events.
 */
export function isGraphableProcess(passedEvent: ResolverEvent) {
  return eventType(passedEvent) === 'processCreated' || eventType(passedEvent) === 'processRan';
}

function isValue(field: string | string[], value: string) {
  if (field instanceof Array) {
    return field.length === 1 && field[0] === value;
  } else {
    return field === value;
  }
}

/**
 * Returns a custom event type for a process event based on the event's metadata.
 */
export function eventType(passedEvent: ResolverEvent) {
  if (isLegacyEvent(passedEvent)) {
    const {
      endgame: { event_type_full: type, event_subtype_full: subType },
    } = passedEvent;

    if (type === 'process_event') {
      if (subType === 'creation_event' || subType === 'fork_event' || subType === 'exec_event') {
        return 'processCreated';
      } else if (subType === 'already_running') {
        return 'processRan';
      } else if (subType === 'termination_event') {
        return 'processTerminated';
      } else {
        return 'unknownProcessEvent';
      }
    } else if (type === 'alert_event') {
      return 'processCausedAlert';
    }
    return 'unknownEvent';
  } else {
    const {
      event: { type, category, kind },
    } = passedEvent;
    if (isValue(category, 'process')) {
      if (isValue(type, 'start') || isValue(type, 'change')) {
        return 'processCreated';
      } else if (isValue(type, 'info')) {
        return 'processRan';
      } else if (isValue(type, 'end')) {
        return 'processTerminated';
      } else {
        return 'unknownProcessEvent';
      }
    } else if (kind === 'alert') {
      return 'processCausedAlert';
    }
  }
}

/**
 * Returns the process event's pid
 */
export function uniquePidForProcess(event: ResolverEvent) {
  if (isLegacyEvent(event)) {
    return String(event.endgame.unique_pid);
  } else {
    return event.endpoint.process.entity_id;
  }
}

/**
 * Returns the process event's parent pid
 */
export function uniqueParentPidForProcess(event: ResolverEvent) {
  if (isLegacyEvent(event)) {
    return String(event.endgame.unique_ppid);
  } else {
    return event.endpoint.process.parent?.entity_id;
  }
}
