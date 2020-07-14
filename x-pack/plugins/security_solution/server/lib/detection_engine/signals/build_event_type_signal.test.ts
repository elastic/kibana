/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sampleDocNoSortId } from './__mocks__/es_results';
import { buildEventTypeSignal } from './build_event_type_signal';

describe('buildEventTypeSignal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it returns the event appended of kind signal if it does not exist', () => {
    const doc = sampleDocNoSortId();
    delete doc._source.event;
    const eventType = buildEventTypeSignal(doc);
    const expected: object = { kind: 'signal' };
    expect(eventType).toEqual(expected);
  });

  test('it returns the event appended of kind signal if it is an empty object', () => {
    const doc = sampleDocNoSortId();
    doc._source.event = {};
    const eventType = buildEventTypeSignal(doc);
    const expected: object = { kind: 'signal' };
    expect(eventType).toEqual(expected);
  });

  test('it returns the event with kind signal and other properties if they exist', () => {
    const doc = sampleDocNoSortId();
    doc._source.event = {
      action: 'socket_opened',
      module: 'system',
      dataset: 'socket',
    };
    const eventType = buildEventTypeSignal(doc);
    const expected: object = {
      action: 'socket_opened',
      module: 'system',
      dataset: 'socket',
      kind: 'signal',
    };
    expect(eventType).toEqual(expected);
  });
});
