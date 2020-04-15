/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverEvent } from '../../../../common/types';
import { isLegacyEvent } from '../../../../common/models/event';

export function extractEventID(event: ResolverEvent) {
  if (isLegacyEvent(event)) {
    return String(event.endgame.serial_event_id);
  }
  return event.event.id;
}

export function extractEntityID(event: ResolverEvent) {
  if (isLegacyEvent(event)) {
    return String(event.endgame.unique_pid);
  }
  return event.process.entity_id;
}

export function extractParentEntityID(event: ResolverEvent) {
  if (isLegacyEvent(event)) {
    const ppid = event.endgame.unique_ppid;
    return ppid && String(ppid); // if unique_ppid is undefined return undefined
  }
  return event.process.parent?.entity_id;
}
