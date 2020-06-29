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

export function isTerminatedProcess(passedEvent: ResolverEvent) {
  return eventType(passedEvent) === 'processTerminated';
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
 * Returns the pid for the process on the host
 */
export function processPid(passedEvent: ResolverEvent): number | undefined {
  if (event.isLegacyEvent(passedEvent)) {
    return passedEvent.endgame.pid;
  } else {
    return passedEvent.process.pid;
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

/**
 * Returns the process event's parent pid
 */
export function processParentPid(passedEvent: ResolverEvent): number | undefined {
  if (event.isLegacyEvent(passedEvent)) {
    return passedEvent.endgame.ppid;
  } else {
    return passedEvent.process.parent?.pid;
  }
}

/**
 * Returns the process event's path on its host
 */
export function processPath(passedEvent: ResolverEvent): string | undefined {
  if (event.isLegacyEvent(passedEvent)) {
    return passedEvent.endgame.process_path;
  } else {
    return passedEvent.process.executable;
  }
}

/**
 * Returns the username for the account that ran the process
 */
export function userInfoForProcess(
  passedEvent: ResolverEvent
): { user?: string; domain?: string } | undefined {
  return passedEvent.user;
}

/**
 * Returns the MD5 hash for the `passedEvent` param, or undefined if it can't be located
 * @param {ResolverEvent} passedEvent The `ResolverEvent` to get the MD5 value for
 * @returns {string | undefined} The MD5 string for the event
 */
export function md5HashForProcess(passedEvent: ResolverEvent): string | undefined {
  if (event.isLegacyEvent(passedEvent)) {
    // There is not currently a key for this on Legacy event types
    return undefined;
  }
  return passedEvent?.process?.hash?.md5;
}

/**
 * Returns the command line path and arguments used to run the `passedEvent` if any
 *
 * @param {ResolverEvent} passedEvent The `ResolverEvent` to get the arguemnts value for
 * @returns {string | undefined} The arguments (including the path) used to run the process
 */
export function argsForProcess(passedEvent: ResolverEvent): string | undefined {
  if (event.isLegacyEvent(passedEvent)) {
    // There is not currently a key for this on Legacy event types
    return undefined;
  }
  return passedEvent?.process?.args;
}
