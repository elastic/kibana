/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { eventType } from './process_event';
import { ProcessEvent } from '../types';
import { mockProcessEvent } from './process_event_test_helpers';

describe('process event', () => {
  describe('eventType', () => {
    let event: ProcessEvent;
    beforeEach(() => {
      event = mockProcessEvent({
        data_buffer: {
          node_id: 1,
          event_type_full: 'process_event',
        },
      });
    });
    it("returns the right value when the subType is 'creation_event'", () => {
      event.data_buffer.event_subtype_full = 'creation_event';
      expect(eventType(event)).toEqual('processCreated');
    });
  });
});
