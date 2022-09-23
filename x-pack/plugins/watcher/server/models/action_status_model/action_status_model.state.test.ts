/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeWith, isObject } from 'lodash';

import { ACTION_STATES } from '../../../common/constants';
import { ActionStatusModelEs } from '../../../common/types';
import { buildServerActionStatusModel, buildClientActionStatusModel } from './action_status_model';

// Treat all nested properties of type as optional.
type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

const createModelWithActions = (
  customActionStatusJson?: DeepPartial<ActionStatusModelEs['actionStatusJson']>,
  hasErrors: boolean = false
) => {
  // Set srcValue to {} to define an empty property.
  const mergeFn = (destValue: any, srcValue: any) => {
    if (isObject(srcValue) && Object.keys(srcValue).length === 0) {
      return {};
    }
    // Default merge behavior.
    return undefined;
  };

  const actionStatusJson = mergeWith(
    {
      ack: {
        timestamp: '2017-03-01T20:56:58.442Z',
        state: 'acked',
      },
      last_successful_execution: {
        timestamp: '2017-03-01T20:55:49.679Z',
        successful: true,
      },
      last_execution: {
        timestamp: '2017-03-01T20:55:49.679Z',
        successful: true,
        reason: 'reasons',
      },
      last_throttle: {
        timestamp: '2017-03-01T20:55:49.679Z',
        reason: 'reasons',
      },
    },
    customActionStatusJson,
    mergeFn
  );

  const serverActionStatusModel = buildServerActionStatusModel({
    id: 'my-action',
    lastCheckedRawFormat: '2017-03-01T20:55:49.679Z',
    actionStatusJson,
    errors: hasErrors ? { foo: 'bar' } : undefined,
  });

  return buildClientActionStatusModel(serverActionStatusModel);
};

// NOTE: It's easier to test states through ActionStatusModel instead of
// testing individual util functions because they require mocked timestamps
// to be Moment instances, whereas ActionStatusModel only requires strings.
describe('ActionStatusModel states', () => {
  describe('ACTION_STATES.CONFIG_ERROR', () => {
    it('is set when there are errors', () => {
      const clientActionStatusModel = createModelWithActions(undefined, true);
      expect(clientActionStatusModel.state).toBe(ACTION_STATES.CONFIG_ERROR);
    });
  });

  describe(`ACTION_STATES.ERROR`, () => {
    it('is set when isLastExecutionSuccessful is equal to false and it is the most recent execution', () => {
      const clientActionStatusModel = createModelWithActions({
        last_execution: {
          successful: false,
        },
      });
      expect(clientActionStatusModel.state).toBe(ACTION_STATES.ERROR);
    });

    it('is set when action is acked and lastAcknowledged is less than lastExecution', () => {
      const clientActionStatusModel = createModelWithActions({
        ack: {
          state: 'acked',
          timestamp: '2017-03-01T00:00:00.000Z',
        },
        last_execution: {
          timestamp: '2017-03-02T00:00:00.000Z',
          successful: true,
          reason: 'reasons',
        },
      });

      expect(clientActionStatusModel.state).toBe(ACTION_STATES.ERROR);
    });

    it('is set when action is ackable and lastSuccessfulExecution is less than lastExecution', () => {
      const clientActionStatusModel = createModelWithActions({
        ack: {
          state: 'ackable',
        },
        last_successful_execution: {
          timestamp: '2017-03-01T00:00:00.000Z',
        },
        last_execution: {
          timestamp: '2017-03-02T00:00:00.000Z',
        },
        last_throttle: {},
      });
      expect(clientActionStatusModel.state).toBe(ACTION_STATES.ERROR);
    });
  });

  describe(`ACTION_STATES.OK`, () => {
    it('is set when state is awaits_successful_execution', () => {
      const clientActionStatusModel = createModelWithActions({
        ack: {
          state: 'awaits_successful_execution',
        },
      });
      expect(clientActionStatusModel.state).toBe(ACTION_STATES.OK);
    });

    it(`is set when lastSuccessfulExecution is equal to lastExecution`, () => {
      const clientActionStatusModel = createModelWithActions({
        ack: {
          state: 'ackable',
        },
        last_successful_execution: {
          timestamp: '2017-03-01T00:00:00.000Z',
        },
        last_execution: {
          timestamp: '2017-03-01T00:00:00.000Z',
        },
        last_throttle: {},
      });
      expect(clientActionStatusModel.state).toBe(ACTION_STATES.OK);
    });

    it(`is set when lastSuccessfulExecution is greater than lastExecution`, () => {
      const clientActionStatusModel = createModelWithActions({
        ack: {
          state: 'ackable',
        },
        last_successful_execution: {
          timestamp: '2017-03-02T00:00:00.000Z',
        },
        last_execution: {
          timestamp: '2017-03-01T00:00:00.000Z',
        },
        last_throttle: {},
      });
      expect(clientActionStatusModel.state).toBe(ACTION_STATES.OK);
    });
  });

  describe(`ACTION_STATES.ACKNOWLEDGED`, () => {
    it(`is set when lastAcknowledged is equal to lastExecution`, () => {
      const clientActionStatusModel = createModelWithActions({
        ack: {
          state: 'acked',
          timestamp: '2017-03-01T00:00:00.000Z',
        },
        last_execution: {
          timestamp: '2017-03-01T00:00:00.000Z',
        },
      });
      expect(clientActionStatusModel.state).toBe(ACTION_STATES.ACKNOWLEDGED);
    });

    it(`is set when lastAcknowledged is greater than lastExecution`, () => {
      const clientActionStatusModel = createModelWithActions({
        ack: {
          state: 'acked',
          timestamp: '2017-03-02T00:00:00.000Z',
        },
        last_execution: {
          timestamp: '2017-03-01T00:00:00.000Z',
        },
      });
      expect(clientActionStatusModel.state).toBe(ACTION_STATES.ACKNOWLEDGED);
    });
  });

  describe(`ACTION_STATES.THROTTLED`, () => {
    it(`is set when lastThrottled is equal to lastExecution`, () => {
      const clientActionStatusModel = createModelWithActions({
        ack: {
          state: 'ackable',
        },
        last_execution: {
          timestamp: '2017-03-01T00:00:00.000Z',
        },
        last_throttle: {
          timestamp: '2017-03-01T00:00:00.000Z',
        },
      });
      expect(clientActionStatusModel.state).toBe(ACTION_STATES.THROTTLED);
    });

    it(`is set when lastThrottled is greater than lastExecution`, () => {
      const clientActionStatusModel = createModelWithActions({
        ack: {
          state: 'ackable',
        },
        last_execution: {
          timestamp: '2017-03-01T00:00:00.000Z',
        },
        last_throttle: {
          timestamp: '2017-03-02T00:00:00.000Z',
        },
      });
      expect(clientActionStatusModel.state).toBe(ACTION_STATES.THROTTLED);
    });
  });

  describe(`ACTION_STATES.UNKNOWN`, () => {
    it(`is set if it can't determine the state`, () => {
      const clientActionStatusModel = createModelWithActions({
        ack: {
          // @ts-ignore
          state: 'foo',
        },
        last_successful_execution: {
          successful: true,
        },
      });
      expect(clientActionStatusModel.state).toBe(ACTION_STATES.UNKNOWN);
    });
  });
});
