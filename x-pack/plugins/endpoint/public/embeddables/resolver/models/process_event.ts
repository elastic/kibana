/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointEvent } from '../../../../common/types';

/**
 * Returns true if the process's eventType is either 'processCreated' or 'processRan'.
 * Resolver will only render 'graphable' process events.
 */
export function isGraphableProcess(passedEvent: EndpointEvent) {
  return eventType(passedEvent) === 'processCreated' || eventType(passedEvent) === 'processRan';
}

/**
 * Returns a custom event type for a process event based on the event's metadata.
 */
export function eventType(passedEvent: EndpointEvent) {
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
}

/**
 * Returns the process event's pid
 */
export function uniquePidForProcess(passedEvent: EndpointEvent) {
  return passedEvent.endgame.unique_pid;
}

/**
 * Returns the process event's parent pid
 */
export function uniqueParentPidForProcess(passedEvent: EndpointEvent) {
  return passedEvent.endgame.unique_ppid;
}
