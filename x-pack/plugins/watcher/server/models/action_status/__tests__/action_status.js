/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ActionStatus } from '../action_status';
import { ACTION_STATES } from '../../../../common/constants';
import moment from 'moment';

describe('action_status', () => {
  describe('ActionStatus', () => {
    describe('fromUpstreamJson factory method', () => {
      let upstreamJson;
      beforeEach(() => {
        upstreamJson = {
          id: 'my-action',
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
            },
            last_successful_execution: {
              timestamp: '2017-03-01T20:55:49.679Z',
              successful: true,
            },
          },
        };
      });

      it(`throws an error if no 'id' property in json`, () => {
        delete upstreamJson.id;
        expect(ActionStatus.fromUpstreamJson)
          .withArgs(upstreamJson)
          .to.throwError('JSON argument must contain an "id" property');
      });

      it(`throws an error if no 'actionStatusJson' property in json`, () => {
        delete upstreamJson.actionStatusJson;
        expect(ActionStatus.fromUpstreamJson)
          .withArgs(upstreamJson)
          .to.throwError('JSON argument must contain an "actionStatusJson" property');
      });

      it('returns correct ActionStatus instance', () => {
        const actionStatus = ActionStatus.fromUpstreamJson({
          ...upstreamJson,
          errors: { foo: 'bar' },
        });

        expect(actionStatus.id).to.be(upstreamJson.id);
        expect(actionStatus.lastAcknowledged).to.eql(
          moment(upstreamJson.actionStatusJson.ack.timestamp)
        );
        expect(actionStatus.lastExecution).to.eql(
          moment(upstreamJson.actionStatusJson.last_execution.timestamp)
        );
        expect(actionStatus.lastExecutionSuccessful).to.eql(
          upstreamJson.actionStatusJson.last_execution.successful
        );
        expect(actionStatus.lastExecutionReason).to.be(
          upstreamJson.actionStatusJson.last_execution.reason
        );
        expect(actionStatus.lastThrottled).to.eql(
          moment(upstreamJson.actionStatusJson.last_throttle.timestamp)
        );
        expect(actionStatus.lastSuccessfulExecution).to.eql(
          moment(upstreamJson.actionStatusJson.last_successful_execution.timestamp)
        );
        expect(actionStatus.errors).to.eql({ foo: 'bar' });
      });
    });

    describe('state getter method', () => {
      let upstreamJson;
      beforeEach(() => {
        upstreamJson = {
          id: 'my-action',
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
            },
            last_successful_execution: {
              timestamp: '2017-03-01T20:55:49.679Z',
              successful: true,
            },
          },
        };
      });

      it(`correctly calculates ACTION_STATES.ERROR`, () => {
        upstreamJson.actionStatusJson.last_execution.successful = false;
        const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

        expect(actionStatus.state).to.be(ACTION_STATES.ERROR);
      });

      it('correctly calculates ACTION_STATES.CONFIG_ERROR', () => {
        const actionStatus = ActionStatus.fromUpstreamJson({
          ...upstreamJson,
          errors: { foo: 'bar' },
        });
        expect(actionStatus.state).to.be(ACTION_STATES.CONFIG_ERROR);
      });

      it(`correctly calculates ACTION_STATES.OK`, () => {
        upstreamJson.actionStatusJson.ack.state = 'awaits_successful_execution';
        const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

        expect(actionStatus.state).to.be(ACTION_STATES.OK);
      });

      describe(`correctly calculates ACTION_STATES.ACKNOWLEDGED`, () => {
        it(`when lastAcknowledged is equal to lastExecution`, () => {
          upstreamJson.actionStatusJson.ack.state = 'acked';
          upstreamJson.actionStatusJson.ack.timestamp = '2017-03-01T00:00:00.000Z';
          upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
          const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

          expect(actionStatus.state).to.be(ACTION_STATES.ACKNOWLEDGED);
        });

        it(`when lastAcknowledged is greater than lastExecution`, () => {
          upstreamJson.actionStatusJson.ack.state = 'acked';
          upstreamJson.actionStatusJson.ack.timestamp = '2017-03-02T00:00:00.000Z';
          upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
          const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

          expect(actionStatus.state).to.be(ACTION_STATES.ACKNOWLEDGED);
        });
      });

      describe(`correctly calculates ACTION_STATES.THROTTLED`, () => {
        it(`when lastThrottled is equal to lastExecution`, () => {
          upstreamJson.actionStatusJson.ack.state = 'ackable';
          upstreamJson.actionStatusJson.last_throttle.timestamp = '2017-03-01T00:00:00.000Z';
          upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
          const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

          expect(actionStatus.state).to.be(ACTION_STATES.THROTTLED);
        });

        it(`when lastThrottled is greater than lastExecution`, () => {
          upstreamJson.actionStatusJson.ack.state = 'ackable';
          upstreamJson.actionStatusJson.last_throttle.timestamp = '2017-03-02T00:00:00.000Z';
          upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
          const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

          expect(actionStatus.state).to.be(ACTION_STATES.THROTTLED);
        });
      });

      describe(`correctly calculates ACTION_STATES.FIRING`, () => {
        it(`when lastSuccessfulExecution is equal to lastExecution`, () => {
          delete upstreamJson.actionStatusJson.last_throttle;
          upstreamJson.actionStatusJson.ack.state = 'ackable';
          upstreamJson.actionStatusJson.last_successful_execution.timestamp =
            '2017-03-01T00:00:00.000Z';
          upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
          const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

          expect(actionStatus.state).to.be(ACTION_STATES.FIRING);
        });

        it(`when lastSuccessfulExecution is greater than lastExecution`, () => {
          delete upstreamJson.actionStatusJson.last_throttle;
          upstreamJson.actionStatusJson.ack.state = 'ackable';
          upstreamJson.actionStatusJson.last_successful_execution.timestamp =
            '2017-03-02T00:00:00.000Z';
          upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
          const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

          expect(actionStatus.state).to.be(ACTION_STATES.FIRING);
        });
      });

      it(`correctly calculates ACTION_STATES.ERROR`, () => {
        delete upstreamJson.actionStatusJson.last_throttle;
        upstreamJson.actionStatusJson.ack.state = 'ackable';
        upstreamJson.actionStatusJson.last_successful_execution.timestamp =
          '2017-03-01T00:00:00.000Z';
        upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-02T00:00:00.000Z';
        const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

        expect(actionStatus.state).to.be(ACTION_STATES.ERROR);
      });

      it(`throws an error if it can not determine ACTION_STATE`, () => {
        upstreamJson = {
          id: 'my-action',
          actionStatusJson: {
            ack: { state: 'foo' },
            last_successful_execution: { successful: true },
          },
        };
        const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

        expect(() => {
          actionStatus.state;
        }).to.throwError(/could not determine action status/i);
      });
    });

    describe('isAckable getter method', () => {
      let upstreamJson;
      beforeEach(() => {
        upstreamJson = {
          id: 'my-action',
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
        const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

        expect(actionStatus.state).to.be(ACTION_STATES.OK);
        expect(actionStatus.isAckable).to.be(false);
      });

      it(`correctly calculated isAckable when in ACTION_STATES.ACKNOWLEDGED`, () => {
        upstreamJson.actionStatusJson.ack.state = 'acked';
        upstreamJson.actionStatusJson.ack.timestamp = '2017-03-01T00:00:00.000Z';
        upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
        const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

        expect(actionStatus.state).to.be(ACTION_STATES.ACKNOWLEDGED);
        expect(actionStatus.isAckable).to.be(false);
      });

      it(`correctly calculated isAckable when in ACTION_STATES.THROTTLED`, () => {
        upstreamJson.actionStatusJson.ack.state = 'ackable';
        upstreamJson.actionStatusJson.last_throttle.timestamp = '2017-03-01T00:00:00.000Z';
        upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
        const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

        expect(actionStatus.state).to.be(ACTION_STATES.THROTTLED);
        expect(actionStatus.isAckable).to.be(true);
      });

      it(`correctly calculated isAckable when in ACTION_STATES.FIRING`, () => {
        delete upstreamJson.actionStatusJson.last_throttle;
        upstreamJson.actionStatusJson.ack.state = 'ackable';
        upstreamJson.actionStatusJson.last_successful_execution.timestamp =
          '2017-03-01T00:00:00.000Z';
        upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-01T00:00:00.000Z';
        const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

        expect(actionStatus.state).to.be(ACTION_STATES.FIRING);
        expect(actionStatus.isAckable).to.be(true);
      });

      it(`correctly calculated isAckable when in ACTION_STATES.ERROR`, () => {
        delete upstreamJson.actionStatusJson.last_throttle;
        upstreamJson.actionStatusJson.ack.state = 'ackable';
        upstreamJson.actionStatusJson.last_successful_execution.timestamp =
          '2017-03-01T00:00:00.000Z';
        upstreamJson.actionStatusJson.last_execution.timestamp = '2017-03-02T00:00:00.000Z';
        const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

        expect(actionStatus.state).to.be(ACTION_STATES.ERROR);
        expect(actionStatus.isAckable).to.be(false);
      });
    });

    describe('downstreamJson getter method', () => {
      let upstreamJson;
      beforeEach(() => {
        upstreamJson = {
          id: 'my-action',
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
            },
            last_successful_execution: {
              timestamp: '2017-03-01T20:55:49.679Z',
              successful: true,
            },
          },
        };
      });

      it('returns correct JSON for client', () => {
        const actionStatus = ActionStatus.fromUpstreamJson(upstreamJson);

        const json = actionStatus.downstreamJson;

        expect(json.id).to.be(actionStatus.id);
        expect(json.state).to.be(actionStatus.state);
        expect(json.isAckable).to.be(actionStatus.isAckable);
        expect(json.lastAcknowledged).to.be(actionStatus.lastAcknowledged);
        expect(json.lastThrottled).to.be(actionStatus.lastThrottled);
        expect(json.lastExecution).to.be(actionStatus.lastExecution);
        expect(json.lastExecutionSuccessful).to.be(actionStatus.lastExecutionSuccessful);
        expect(json.lastExecutionReason).to.be(actionStatus.lastExecutionReason);
        expect(json.lastSuccessfulExecution).to.be(actionStatus.lastSuccessfulExecution);
      });
    });
  });
});
