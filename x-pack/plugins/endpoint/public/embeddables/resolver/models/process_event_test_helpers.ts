/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyEndpointEvent } from '../../../../common/types';

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };
/**
 * Creates a mock process event given the 'parts' argument, which can
 * include all or some process event fields as determined by the ProcessEvent type.
 * The only field that must be provided is the event's 'node_id' field.
 * The other fields are populated by the function unless provided in 'parts'
 */
export function mockProcessEvent(parts: {
  endgame: {
    unique_pid: LegacyEndpointEvent['endgame']['unique_pid'];
    unique_ppid?: LegacyEndpointEvent['endgame']['unique_ppid'];
    process_name?: LegacyEndpointEvent['endgame']['process_name'];
    event_subtype_full?: LegacyEndpointEvent['endgame']['event_subtype_full'];
    event_type_full?: LegacyEndpointEvent['endgame']['event_type_full'];
  } & DeepPartial<LegacyEndpointEvent>;
}): LegacyEndpointEvent {
  const { endgame: dataBuffer } = parts;
  return {
    endgame: {
      ...dataBuffer,
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
      serial_event_id: 1,
    },
    '@timestamp': 1582233383000,
    agent: {
      type: '',
      id: '',
      version: '',
    },
    ...parts,
  };
}
