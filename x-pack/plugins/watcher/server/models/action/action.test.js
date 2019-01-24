/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from './action';
import { LoggingAction } from './logging_action';
import { ACTION_TYPES } from '../../../common/constants';

jest.mock('./logging_action', () => ({
  LoggingAction: {
    fromUpstreamJson: jest.fn(({ id }) => ({
      errors: null,
      action: { id, type: 'logging' },
    })),
  }
}));

describe('action', () => {

  describe('Action', () => {

    describe('fromUpstreamJson factory method', () => {

      let upstreamJson;
      beforeEach(() => {
        upstreamJson = {
          id: 'my-action',
          actionJson: {
            "logging": {
              "text": "foo"
            }
          }
        };
      });

      it(`throws an error if no 'id' property in json`, () => {
        delete upstreamJson.id;
        expect(() => {
          Action.fromUpstreamJson(upstreamJson);
        }).toThrowError(/must contain an id property/i);
      });

      it(`throws an error if no 'actionJson' property in json`, () => {
        delete upstreamJson.actionJson;
        expect(() => {
          Action.fromUpstreamJson(upstreamJson);
        }).toThrowError(/must contain an actionJson property/i);
      });

      it(`throws an error if an Action is invalid`, () => {
        const message = 'Missing prop in Logging Action!';

        LoggingAction.fromUpstreamJson.mockReturnValueOnce({
          errors: [{ message }],
          action: {},
        });

        expect(() => {
          Action.fromUpstreamJson(upstreamJson);
        }).toThrowError(message);
      });

      it('returns correct Action instance', () => {
        const action = Action.fromUpstreamJson(upstreamJson);

        expect(action.id).toBe(upstreamJson.id);
      });

    });

    describe('type getter method', () => {

      it(`returns the correct known Action type`, () => {
        const options = { throwExceptions: { Action: false } };

        const upstreamLoggingJson = { id: 'action1', actionJson: { logging: {} } };
        const loggingAction = Action.fromUpstreamJson(upstreamLoggingJson, options);

        const upstreamEmailJson = { id: 'action2', actionJson: { email: {} } };
        const emailAction = Action.fromUpstreamJson(upstreamEmailJson, options);

        const upstreamSlackJson = { id: 'action3', actionJson: { slack: {} } };
        const slackAction = Action.fromUpstreamJson(upstreamSlackJson, options);

        expect(loggingAction.type).toBe(ACTION_TYPES.LOGGING);
        expect(emailAction.type).toBe(ACTION_TYPES.EMAIL);
        expect(slackAction.type).toBe(ACTION_TYPES.SLACK);
      });

      it(`returns ACTION_TYPES.UNKNOWN when there is no valid model class`, () => {
        const upstreamJson = {
          id: 'my-action',
          actionJson: {
            unknown_action_type: {
              'foo': 'bar'
            }
          }
        };
        const action = Action.fromUpstreamJson(upstreamJson);

        expect(action.type).toBe(ACTION_TYPES.UNKNOWN);
      });

    });

    describe('downstreamJson getter method', () => {

      let upstreamJson;
      beforeEach(() => {
        upstreamJson = {
          id: 'my-action',
          actionJson: {
            "email": {
              "to": "elastic@elastic.co"
            }
          }
        };
      });

      it('returns correct JSON for client', () => {

        const action = Action.fromUpstreamJson(upstreamJson);

        const json = action.downstreamJson;

        expect(json.id).toBe(action.id);
        expect(json.type).toBe(action.type);
      });

    });

  });

});
