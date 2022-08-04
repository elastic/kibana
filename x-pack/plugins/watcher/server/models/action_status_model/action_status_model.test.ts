/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { ACTION_STATES } from '../../../common/constants';
import { ActionStatusUpstreamJson } from '../../../common/types';
import { buildServerActionStatusModel, buildClientActionStatusModel } from './action_status_model';

describe('ActionStatusModel', () => {
  describe('buildServerActionStatusModel', () => {
    let upstreamJson: ActionStatusUpstreamJson;
    beforeEach(() => {
      upstreamJson = {
        id: 'my-action',
        errors: {},
        lastCheckedRawFormat: '2017-03-01T20:55:49.679Z',
        actionStatusJson: {
          ack: {
            timestamp: '2017-03-01T20:56:58.442Z',
            state: 'acked',
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
          last_successful_execution: {
            timestamp: '2017-03-01T20:55:49.679Z',
            successful: true,
          },
        },
      };
    });

    // it(`throws an error if no 'id' property in json`, () => {
    //   delete upstreamJson.id;
    //   expect(() => {
    //     buildServerActionStatusModel(upstreamJson);
    //   }).toThrow('JSON argument must contain an "id" property');
    // });

    // it(`throws an error if no 'actionStatusJson' property in json`, () => {
    //   delete upstreamJson.actionStatusJson;
    //   expect(() => {
    //     buildServerActionStatusModel(upstreamJson);
    //   }).toThrow('JSON argument must contain an "actionStatusJson" property');
    // });

    it('returns correct ActionStatus instance', () => {
      const actionStatus = buildServerActionStatusModel({
        ...upstreamJson,
        errors: { foo: 'bar' },
      });

      expect(actionStatus.id).toBe(upstreamJson.id);
      expect(actionStatus.lastAcknowledged).toEqual(
        moment(upstreamJson.actionStatusJson.ack.timestamp)
      );
      expect(actionStatus.lastExecution).toEqual(
        moment(upstreamJson.actionStatusJson.last_execution?.timestamp)
      );
      expect(actionStatus.lastExecutionSuccessful).toEqual(
        upstreamJson.actionStatusJson.last_execution?.successful
      );
      expect(actionStatus.lastExecutionReason).toBe(
        upstreamJson.actionStatusJson.last_execution?.reason
      );
      expect(actionStatus.lastThrottled).toEqual(
        moment(upstreamJson.actionStatusJson.last_throttle?.timestamp)
      );
      expect(actionStatus.lastSuccessfulExecution).toEqual(
        moment(upstreamJson.actionStatusJson.last_successful_execution?.timestamp)
      );
      expect(actionStatus.errors).toEqual({ foo: 'bar' });
    });
  });

  describe('state', () => {
    let upstreamJson: ActionStatusUpstreamJson;
    beforeEach(() => {
      upstreamJson = {
        id: 'my-action',
        errors: {},
        lastCheckedRawFormat: '2017-03-01T20:55:49.679Z',
        actionStatusJson: {
          ack: {
            timestamp: '2017-03-01T20:56:58.442Z',
            state: 'acked',
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
          last_successful_execution: {
            timestamp: '2017-03-01T20:55:49.679Z',
            successful: true,
          },
        },
      };
    });

    describe(`correctly calculates ACTION_STATES.ERROR`, () => {
      it('lastExecutionSuccessful is equal to false and it is the most recent execution', () => {
        upstreamJson.actionStatusJson.last_execution!.successful = false;
        const actionStatus = buildClientActionStatusModel(
          buildServerActionStatusModel(upstreamJson)
        );
        expect(actionStatus.state).toBe(ACTION_STATES.ERROR);
      });

      it('action is acked and lastAcknowledged is less than lastExecution', () => {
        const actionStatus = buildClientActionStatusModel(
          buildServerActionStatusModel({
            ...upstreamJson,
            actionStatusJson: {
              ack: {
                state: 'acked',
                timestamp: '2017-03-01T00:00:00.000Z',
              },
              last_execution: {
                timestamp: '2017-03-02T00:00:00.000Z',
                successful: true,
                reason: 'reasons',
              },
            },
          })
        );
        expect(actionStatus.state).toBe(ACTION_STATES.ERROR);
      });

      it('action is ackable and lastSuccessfulExecution is less than lastExecution', () => {
        delete upstreamJson.actionStatusJson.last_throttle;
        upstreamJson.actionStatusJson.ack.state = 'ackable';
        upstreamJson.actionStatusJson.last_successful_execution!.timestamp =
          '2017-03-01T00:00:00.000Z';
        upstreamJson.actionStatusJson.last_execution!.timestamp = '2017-03-02T00:00:00.000Z';
        const actionStatus = buildClientActionStatusModel(
          buildServerActionStatusModel(upstreamJson)
        );

        expect(actionStatus.state).toBe(ACTION_STATES.ERROR);
      });
    });

    it('correctly calculates ACTION_STATES.CONFIG_ERROR', () => {
      const actionStatus = buildClientActionStatusModel(
        buildServerActionStatusModel({
          ...upstreamJson,
          errors: { foo: 'bar' },
        })
      );
      expect(actionStatus.state).toBe(ACTION_STATES.CONFIG_ERROR);
    });

    it(`correctly calculates ACTION_STATES.OK`, () => {
      upstreamJson.actionStatusJson.ack.state = 'awaits_successful_execution';
      const actionStatus = buildClientActionStatusModel(buildServerActionStatusModel(upstreamJson));

      expect(actionStatus.state).toBe(ACTION_STATES.OK);
    });

    describe(`correctly calculates ACTION_STATES.ACKNOWLEDGED`, () => {
      it(`when lastAcknowledged is equal to lastExecution`, () => {
        upstreamJson.actionStatusJson.ack.state = 'acked';
        upstreamJson.actionStatusJson.ack.timestamp = '2017-03-01T00:00:00.000Z';
        upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
        const actionStatus = buildClientActionStatusModel(
          buildServerActionStatusModel(upstreamJson)
        );

        expect(actionStatus.state).toBe(ACTION_STATES.ACKNOWLEDGED);
      });

      it(`when lastAcknowledged is greater than lastExecution`, () => {
        upstreamJson.actionStatusJson.ack.state = 'acked';
        upstreamJson.actionStatusJson.ack.timestamp = '2017-03-02T00:00:00.000Z';
        upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
        const actionStatus = buildClientActionStatusModel(
          buildServerActionStatusModel(upstreamJson)
        );

        expect(actionStatus.state).toBe(ACTION_STATES.ACKNOWLEDGED);
      });
    });

    describe(`correctly calculates ACTION_STATES.THROTTLED`, () => {
      it(`when lastThrottled is equal to lastExecution`, () => {
        upstreamJson.actionStatusJson.ack.state = 'ackable';
        upstreamJson.actionStatusJson.last_throttle.timestamp = '2017-03-01T00:00:00.000Z';
        upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
        const actionStatus = buildClientActionStatusModel(
          buildServerActionStatusModel(upstreamJson)
        );

        expect(actionStatus.state).toBe(ACTION_STATES.THROTTLED);
      });

      it(`when lastThrottled is greater than lastExecution`, () => {
        upstreamJson.actionStatusJson.ack.state = 'ackable';
        upstreamJson.actionStatusJson.last_throttle.timestamp = '2017-03-02T00:00:00.000Z';
        upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
        const actionStatus = buildClientActionStatusModel(
          buildServerActionStatusModel(upstreamJson)
        );

        expect(actionStatus.state).toBe(ACTION_STATES.THROTTLED);
      });
    });

    describe(`correctly calculates ACTION_STATES.FIRING`, () => {
      it(`when lastSuccessfulExecution is equal to lastExecution`, () => {
        delete upstreamJson.actionStatusJson.last_throttle;
        upstreamJson.actionStatusJson.ack.state = 'ackable';
        upstreamJson.actionStatusJson.last_successful_execution.timestamp =
          '2017-03-01T00:00:00.000Z';
        upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
        const actionStatus = buildClientActionStatusModel(
          buildServerActionStatusModel(upstreamJson)
        );

        expect(actionStatus.state).toBe(ACTION_STATES.FIRING);
      });

      it(`when lastSuccessfulExecution is greater than lastExecution`, () => {
        delete upstreamJson.actionStatusJson.last_throttle;
        upstreamJson.actionStatusJson.ack.state = 'ackable';
        upstreamJson.actionStatusJson.last_successful_execution.timestamp =
          '2017-03-02T00:00:00.000Z';
        upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
        const actionStatus = buildClientActionStatusModel(
          buildServerActionStatusModel(upstreamJson)
        );

        expect(actionStatus.state).toBe(ACTION_STATES.FIRING);
      });
    });

    it(`correctly calculates ACTION_STATES.UNKNOWN if it can not determine state`, () => {
      upstreamJson = {
        id: 'my-action',
        actionStatusJson: {
          ack: { state: 'foo' },
          last_successful_execution: { successful: true },
        },
      };
      const actionStatus = buildClientActionStatusModel(buildServerActionStatusModel(upstreamJson));

      expect(actionStatus.state).toBe(ACTION_STATES.UNKNOWN);
    });
  });

  describe('isAckable', () => {
    let upstreamJson: ActionStatusUpstreamJson;
    beforeEach(() => {
      upstreamJson = {
        id: 'my-action',
        errors: {},
        lastCheckedRawFormat: '2017-03-01T20:55:49.679Z',
        actionStatusJson: {
          ack: {
            timestamp: '2017-03-01T20:56:58.442Z',
            state: 'acked',
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
          last_successful_execution: {
            timestamp: '2017-03-01T20:55:49.679Z',
            successful: true,
          },
        },
      };
    });

    it(`correctly calculated isAckable when in ACTION_STATES.OK`, () => {
      upstreamJson.actionStatusJson.ack.state = 'awaits_successful_execution';
      const actionStatus = buildClientActionStatusModel(buildServerActionStatusModel(upstreamJson));

      expect(actionStatus.state).toBe(ACTION_STATES.OK);
      expect(actionStatus.isAckable).toBe(false);
    });

    it(`correctly calculated isAckable when in ACTION_STATES.ACKNOWLEDGED`, () => {
      upstreamJson.actionStatusJson.ack.state = 'acked';
      upstreamJson.actionStatusJson.ack.timestamp = '2017-03-01T00:00:00.000Z';
      upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
      const actionStatus = buildClientActionStatusModel(buildServerActionStatusModel(upstreamJson));

      expect(actionStatus.state).toBe(ACTION_STATES.ACKNOWLEDGED);
      expect(actionStatus.isAckable).toBe(false);
    });

    it(`correctly calculated isAckable when in ACTION_STATES.THROTTLED`, () => {
      upstreamJson.actionStatusJson.ack.state = 'ackable';
      upstreamJson.actionStatusJson.last_throttle.timestamp = '2017-03-01T00:00:00.000Z';
      upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
      const actionStatus = buildClientActionStatusModel(buildServerActionStatusModel(upstreamJson));

      expect(actionStatus.state).toBe(ACTION_STATES.THROTTLED);
      expect(actionStatus.isAckable).toBe(true);
    });

    it(`correctly calculated isAckable when in ACTION_STATES.FIRING`, () => {
      delete upstreamJson.actionStatusJson.last_throttle;
      upstreamJson.actionStatusJson.ack.state = 'ackable';
      upstreamJson.actionStatusJson.last_successful_execution.timestamp =
        '2017-03-01T00:00:00.000Z';
      upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
      const actionStatus = buildClientActionStatusModel(buildServerActionStatusModel(upstreamJson));

      expect(actionStatus.state).toBe(ACTION_STATES.FIRING);
      expect(actionStatus.isAckable).toBe(true);
    });

    it(`correctly calculated isAckable when in ACTION_STATES.ERROR`, () => {
      delete upstreamJson.actionStatusJson.last_throttle;
      upstreamJson.actionStatusJson.ack.state = 'ackable';
      upstreamJson.actionStatusJson.last_successful_execution.timestamp =
        '2017-03-01T00:00:00.000Z';
      upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-02T00:00:00.000Z';
      const actionStatus = buildClientActionStatusModel(buildServerActionStatusModel(upstreamJson));

      expect(actionStatus.state).toBe(ACTION_STATES.ERROR);
      expect(actionStatus.isAckable).toBe(false);
    });
  });

  describe('buildClientActionStatusModel', () => {
    let upstreamJson: ActionStatusUpstreamJson;
    beforeEach(() => {
      upstreamJson = {
        id: 'my-action',
        errors: {},
        lastCheckedRawFormat: '2017-03-01T20:55:49.679Z',
        actionStatusJson: {
          ack: {
            timestamp: '2017-03-01T20:56:58.442Z',
            state: 'acked',
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
          last_successful_execution: {
            timestamp: '2017-03-01T20:55:49.679Z',
            successful: true,
          },
        },
      };
    });

    it('returns correct JSON for client', () => {
      const actionStatus = buildServerActionStatusModel(upstreamJson);

      const json = buildClientActionStatusModel(actionStatus);

      expect(json.id).toBe(actionStatus.id);
      expect(json.state).toBe(actionStatus.state);
      expect(json.isAckable).toBe(actionStatus.isAckable);
      expect(json.lastAcknowledged).toBe(actionStatus.lastAcknowledged);
      expect(json.lastThrottled).toBe(actionStatus.lastThrottled);
      expect(json.lastExecution).toBe(actionStatus.lastExecution);
      expect(json.lastExecutionSuccessful).toBe(actionStatus.lastExecutionSuccessful);
      expect(json.lastExecutionReason).toBe(actionStatus.lastExecutionReason);
      expect(json.lastSuccessfulExecution).toBe(actionStatus.lastSuccessfulExecution);
    });
  });
});
