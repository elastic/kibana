/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { firstNonNullValue } from '../../../common/endpoint/models/ecs_safety_helpers';

import * as eventModel from '../../../common/endpoint/models/event';
import * as nodeModel from '../../../common/endpoint/models/node';
import { ResolverEvent, SafeResolverEvent, ResolverNode } from '../../../common/endpoint/types';
import { ResolverProcessType } from '../types';

// TODO: These should be handled external to resolver.
// TODO:
/**
 * Returns true if the process's eventType is either 'processCreated' or 'processRan'.
 * Resolver will only render 'graphable' process events.
 * TODO: Move out of resolver
 */
export function isGraphableProcess(passedEvent: SafeResolverEvent) {
  return eventType(passedEvent) === 'processCreated' || eventType(passedEvent) === 'processRan';
}

// TODO: Move out of resolver
export function isTerminatedProcess(passedEvent: SafeResolverEvent) {
  return eventType(passedEvent) === 'processTerminated';
}

/**
 * ms since Unix epoc, based on timestamp.
 * may return NaN if the timestamp wasn't present or was invalid.
 */
export function datetime(node: ResolverNode): number | null {
  const timestamp = nodeModel.nodeDataTimestamp(node);

  const time = timestamp === undefined ? 0 : new Date(timestamp).getTime();

  // if the date could not be parsed, return null
  return isNaN(time) ? null : time;
}

/**
 * Returns a custom event type for a process event based on the event's metadata.
 * TODO: move out of resolver
 */
export function eventType(passedEvent: SafeResolverEvent): ResolverProcessType {
  if (eventModel.isLegacyEventSafeVersion(passedEvent)) {
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
    const type = new Set(eventModel.eventType(passedEvent));
    const category = new Set(eventModel.eventCategory(passedEvent));
    const kind = new Set(eventModel.eventKind(passedEvent));
    if (category.has('process')) {
      if (type.has('start') || type.has('change') || type.has('creation')) {
        return 'processCreated';
      } else if (type.has('info')) {
        return 'processRan';
      } else if (type.has('end')) {
        return 'processTerminated';
      } else {
        return 'unknownProcessEvent';
      }
    } else if (kind.has('alert')) {
      return 'processCausedAlert';
    }
  }
  return 'unknownEvent';
}

/**
 * Returns the PID for the process on the host
 * TODO: move out of resolver
 */
export function processPID(event: SafeResolverEvent): number | undefined {
  return firstNonNullValue(
    eventModel.isLegacyEventSafeVersion(event) ? event.endgame.pid : event.process?.pid
  );
}

/**
 * Returns the process event's path on its host
 * TODO: move out of resolver
 */
export function processPath(passedEvent: SafeResolverEvent): string | undefined {
  return firstNonNullValue(
    eventModel.isLegacyEventSafeVersion(passedEvent)
      ? passedEvent.endgame.process_path
      : passedEvent.process?.executable
  );
}

/**
 * Returns the username for the account that ran the process
 * TODO: move out of resolver
 */
export function userInfoForProcess(
  passedEvent: ResolverEvent
): { name?: string; domain?: string } | undefined {
  return passedEvent.user;
}

/**
 * Returns the command line path and arguments used to run the `passedEvent` if any
 * TODO: move out of resolver
 *
 * @param {ResolverEvent} passedEvent The `ResolverEvent` to get the arguments value for
 * @returns {string | undefined} The arguments (including the path) used to run the process
 */
export function argsForProcess(passedEvent: ResolverEvent): string | undefined {
  if (eventModel.isLegacyEvent(passedEvent)) {
    // There is not currently a key for this on Legacy event types
    return undefined;
  }
  return passedEvent?.process?.args;
}

/**
 * used to sort events
 */
// TODO: Replace with a more generalized sorter based on the data attribute to be sorted on selected by the user
export function orderByTime(first: ResolverNode, second: ResolverNode): number {
  const firstDatetime: number | null = datetime(first);
  const secondDatetime: number | null = datetime(second);

  if (firstDatetime === secondDatetime) {
    // break ties using an arbitrary (stable) comparison of `eventId` (which should be unique)
    return String(nodeModel.nodeID(first)).localeCompare(String(nodeModel.nodeID(second)));
  } else if (firstDatetime === null || secondDatetime === null) {
    // sort `null`'s as higher than numbers
    return (firstDatetime === null ? 1 : 0) - (secondDatetime === null ? 1 : 0);
  } else {
    // sort in ascending order.
    return firstDatetime - secondDatetime;
  }
}
