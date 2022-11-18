/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, ActorRef, EventObject } from 'xstate';
import { sendIfDefined } from './send_actions';

describe('function sendIfDefined', () => {
  it('sends the events to the specified target', () => {
    const actor = createMockActor();
    const createEvent = (context: {}) => ({
      type: 'testEvent',
    });

    const action = sendIfDefined(actor)(createEvent).get({}, { type: 'triggeringEvent' });

    expect(action).toEqual([
      actions.send('testEvent', {
        to: actor,
      }),
    ]);
  });

  it('sends the events created by the event expression', () => {
    const actor = createMockActor();
    const createEvent = (context: {}) => ({
      type: 'testEvent',
      payload: 'payload',
    });

    const action = sendIfDefined(actor)(createEvent).get({}, { type: 'triggeringEvent' });

    expect(action).toEqual([
      actions.send(
        {
          type: 'testEvent',
          payload: 'payload',
        },
        {
          to: actor,
        }
      ),
    ]);
  });

  it("doesn't send anything when the event expression returns undefined", () => {
    const actor = createMockActor();
    const createEvent = (context: {}) => undefined;

    const action = sendIfDefined(actor)(createEvent).get({}, { type: 'triggeringEvent' });

    expect(action).toEqual(undefined);
  });
});

const createMockActor = <T extends EventObject>(): ActorRef<T> => ({
  getSnapshot: jest.fn(),
  id: 'mockActor',
  send: jest.fn(),
  subscribe: jest.fn(),
  [Symbol.observable]() {
    return this;
  },
});
