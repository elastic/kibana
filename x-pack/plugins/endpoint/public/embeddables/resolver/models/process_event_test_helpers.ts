/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointEvent } from '../../../../common/types';

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };
/**
 * Creates a mock process event given the 'parts' argument, which can
 * include all or some process event fields as determined by the ProcessEvent type.
 * The only field that must be provided is the event's 'node_id' field.
 * The other fields are populated by the function unless provided in 'parts'
 */
export function mockProcessEvent(parts: {
  endgame: {
    unique_pid: EndpointEvent['endgame']['unique_pid'];
    unique_ppid?: EndpointEvent['endgame']['unique_ppid'];
    process_name?: EndpointEvent['endgame']['process_name'];
    event_subtype_full?: EndpointEvent['endgame']['event_subtype_full'];
    event_type_full?: EndpointEvent['endgame']['event_type_full'];
  } & DeepPartial<EndpointEvent>;
}): EndpointEvent {
  const { endgame: dataBuffer } = parts;
  return {
    ...parts,
    endgame: {
      event_timestamp: 1,
      event_type: 1,
      unique_ppid: 0,
      unique_pid: 1,
      machine_id: '',
      event_subtype_full: 'creation_event',
      event_type_full: 'process_event',
      process_name: '',
      process_path: '',
      timestamp_utc: '',
      ...dataBuffer,
    },
    '@timestamp': '',
    event: {
      category: '',
      type: '',
      id: '',
    },
    endpoint: {
      process: {
        entity_id: '',
        parent: {
          entity_id: '',
        },
      },
    },
    agent: {
      type: '',
    },
  };
}
