/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as event from '../../../common/endpoint/models/event';
import { ResolverEvent } from '../../../common/endpoint/types';
import { ResolverProcessType } from '../types';

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
export function eventType(passedEvent: ResolverEvent): ResolverProcessType {
  if (event.isLegacyEvent(passedEvent)) {
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
  } else {
    const {
      event: { type, category, kind },
    } = passedEvent;
    if (isValue(category, 'process')) {
      if (isValue(type, 'start') || isValue(type, 'change') || isValue(type, 'creation')) {
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
  return 'unknownEvent';
}

/**
 * Returns the process event's pid
 */
export function uniquePidForProcess(passedEvent: ResolverEvent): string {
  if (event.isLegacyEvent(passedEvent)) {
    return String(passedEvent.endgame.unique_pid);
  } else {
    return passedEvent.process.entity_id;
  }
}

/**
 * Returns the process event's parent pid
 */
export function uniqueParentPidForProcess(passedEvent: ResolverEvent): string | undefined {
  if (event.isLegacyEvent(passedEvent)) {
    return String(passedEvent.endgame.unique_ppid);
  } else {
    return passedEvent.process.parent?.entity_id;
  }
}
