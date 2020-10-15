/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaults } from 'lodash/fp';
import { LegacyEndpointEvent } from '../../../common/endpoint/types';

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };
/**
 * Creates a mock process event given the 'parts' argument, which can
 * include all or some process event fields as determined by the ProcessEvent type.
 * The only field that must be provided is the event's 'node_id' field.
 * The other fields are populated by the function unless provided in 'parts'
 */
export function mockProcessEvent(parts: DeepPartial<LegacyEndpointEvent>): LegacyEndpointEvent {
  return defaults(
    {
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
        serial_event_id: 1,
      },
      '@timestamp': 1582233383000,
      agent: {
        type: '',
        id: '',
        version: '',
      },
    },
    parts
  ) as LegacyEndpointEvent;
}
