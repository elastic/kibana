/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessEvent } from '../types';
type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

/**
 * Creates a mock process event given the 'parts' argument, which can
 * include all or some process event fields as determined by the ProcessEvent type.
 * The only field that must be provided is the event's 'node_id' field.
 * The other fields are populated by the function unless provided in 'parts'
 */
export function mockProcessEvent(
  parts: {
    data_buffer: { node_id: ProcessEvent['data_buffer']['node_id'] };
  } & DeepPartial<ProcessEvent>
): ProcessEvent {
  const { data_buffer: dataBuffer } = parts;
  return {
    event_timestamp: 1,
    event_type: 1,
    machine_id: '',
    ...parts,
    data_buffer: {
      timestamp_utc: '2019-09-24 01:47:47Z',
      event_subtype_full: 'creation_event',
      event_type_full: 'process_event',
      process_name: '',
      process_path: '',
      ...dataBuffer,
    },
  };
}
