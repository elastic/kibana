/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointEvent } from '../../../../common/types';

/**
 * Creates a mock process event given the 'parts' argument, which can
 * include all or some process event fields as determined by the ProcessEvent type.
 * The only field that must be provided is the event's 'node_id' field.
 * The other fields are populated by the function unless provided in 'parts'
 */
export function mockProcessEvent(parts: {
  endgame: { unique_pid: EndpointEvent['endgame']['unique_pid'] };
}): EndpointEvent {
  const { endgame: dataBuffer } = parts;
  return {
    endgame: {
      event_timestamp: 1,
      event_type: 1,
      machine_id: '',
      event_subtype_full: 'creation_event',
      event_type_full: 'process_event',
      process_name: '',
      process_path: '',
      ...dataBuffer,
      ...parts,
    },
  };
}
