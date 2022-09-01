/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { ACTION_STATES, WATCH_STATES, WATCH_STATE_COMMENTS } from '../../../common/constants';
import { ClientActionStatusModel } from '../../../common/types';
import { deriveState, deriveComment, deriveLastExecution } from './watch_status_model_utils';

const mockActionStatus = (opts: Partial<ClientActionStatusModel>): ClientActionStatusModel => ({
  state: ACTION_STATES.ACTIVE,
  id: 'no-id',
  isAckable: false,
  lastAcknowledged: null,
  lastThrottled: null,
  lastExecution: null,
  isLastExecutionSuccessful: true,
  lastExecutionReason: '',
  lastSuccessfulExecution: null,
  ...opts,
});

describe('WatchStatusModel utils', () => {
  describe('deriveLastExecution', () => {
    it(`is the latest lastExecution from the client action statuses`, () => {
      const actionStatuses = [
        mockActionStatus({ lastExecution: moment('2017-07-05T00:00:00.000Z') }),
        mockActionStatus({ lastExecution: moment('2015-05-26T18:21:08.630Z') }),
      ];
      expect(deriveLastExecution(actionStatuses)).toEqual(moment('2017-07-05T00:00:00.000Z'));
    });
  });

  describe('deriveComment', () => {
    it(`is OK when there are no actions`, () => {
      const isActive = true;
      expect(deriveComment(isActive, [])).toBe(WATCH_STATE_COMMENTS.OK);
    });

    it(`is PARTIALLY_THROTTLED when some action states are throttled and others aren't`, () => {
      const isActive = true;
      const actionStatuses = [
        mockActionStatus({ state: ACTION_STATES.THROTTLED }),
        mockActionStatus({ state: ACTION_STATES.ACTIVE }),
      ];
      expect(deriveComment(isActive, actionStatuses)).toBe(
        WATCH_STATE_COMMENTS.PARTIALLY_THROTTLED
      );
    });

    it(`is THROTTLED when all action states are throttled`, () => {
      const isActive = true;
      const actionStatuses = [
        mockActionStatus({ state: ACTION_STATES.THROTTLED }),
        mockActionStatus({ state: ACTION_STATES.THROTTLED }),
        mockActionStatus({ state: ACTION_STATES.THROTTLED }),
      ];
      expect(deriveComment(isActive, actionStatuses)).toBe(WATCH_STATE_COMMENTS.THROTTLED);
    });

    it(`is PARTIALLY_ACKNOWLEDGED when some action states are acknowledged and others arne't`, () => {
      const isActive = true;
      const actionStatuses = [
        mockActionStatus({ state: ACTION_STATES.ACKNOWLEDGED }),
        mockActionStatus({ state: ACTION_STATES.ACTIVE }),
        mockActionStatus({ state: ACTION_STATES.THROTTLED }),
      ];
      expect(deriveComment(isActive, actionStatuses)).toBe(
        WATCH_STATE_COMMENTS.PARTIALLY_ACKNOWLEDGED
      );
    });

    it(`is ACKNOWLEDGED when all action states are acknowledged`, () => {
      const isActive = true;
      const actionStatuses = [
        mockActionStatus({ state: ACTION_STATES.ACKNOWLEDGED }),
        mockActionStatus({ state: ACTION_STATES.ACKNOWLEDGED }),
        mockActionStatus({ state: ACTION_STATES.ACKNOWLEDGED }),
      ];
      expect(deriveComment(isActive, actionStatuses)).toBe(WATCH_STATE_COMMENTS.ACKNOWLEDGED);
    });

    it(`is FAILING when one action state is failing`, () => {
      const isActive = true;
      const actionStatuses = [
        mockActionStatus({ state: ACTION_STATES.ACTIVE }),
        mockActionStatus({ state: ACTION_STATES.ACKNOWLEDGED }),
        mockActionStatus({ state: ACTION_STATES.THROTTLED }),
        mockActionStatus({ state: ACTION_STATES.ERROR }),
      ];
      expect(deriveComment(isActive, actionStatuses)).toBe(WATCH_STATE_COMMENTS.FAILING);
    });

    it(`is OK when watch is inactive`, () => {
      const isActive = false;
      const actionStatuses = [
        mockActionStatus({ state: ACTION_STATES.ACTIVE }),
        mockActionStatus({ state: ACTION_STATES.ACKNOWLEDGED }),
        mockActionStatus({ state: ACTION_STATES.THROTTLED }),
        mockActionStatus({ state: ACTION_STATES.ERROR }),
      ];
      expect(deriveComment(isActive, actionStatuses)).toBe(WATCH_STATE_COMMENTS.OK);
    });
  });

  describe('deriveState', () => {
    it(`is ACTIVE there are no actions`, () => {
      const isActive = true;
      const watchState = 'awaits_execution';
      expect(deriveState(isActive, watchState, [])).toBe(WATCH_STATES.ACTIVE);
    });

    it(`is ACTIVE when at least one action state is active`, () => {
      const isActive = true;
      const watchState = 'awaits_execution';
      let actionStatuses = [mockActionStatus({ state: ACTION_STATES.ACTIVE })];
      expect(deriveState(isActive, watchState, actionStatuses)).toBe(WATCH_STATES.ACTIVE);

      actionStatuses = [
        mockActionStatus({ state: ACTION_STATES.ACTIVE }),
        mockActionStatus({ state: ACTION_STATES.THROTTLED }),
      ];
      expect(deriveState(isActive, watchState, actionStatuses)).toBe(WATCH_STATES.ACTIVE);

      actionStatuses = [
        mockActionStatus({ state: ACTION_STATES.ACTIVE }),
        mockActionStatus({ state: ACTION_STATES.THROTTLED }),
        mockActionStatus({ state: ACTION_STATES.ACKNOWLEDGED }),
      ];
      expect(deriveState(isActive, watchState, actionStatuses)).toBe(WATCH_STATES.ACTIVE);
    });

    it(`is ERROR when at least one action state is error`, () => {
      const isActive = true;
      const watchState = 'awaits_execution';
      const actionStatuses = [
        mockActionStatus({ state: ACTION_STATES.ACTIVE }),
        mockActionStatus({ state: ACTION_STATES.THROTTLED }),
        mockActionStatus({ state: ACTION_STATES.ACKNOWLEDGED }),
        mockActionStatus({ state: ACTION_STATES.ERROR }),
        mockActionStatus({ state: ACTION_STATES.CONFIG_ERROR }),
      ];
      expect(deriveState(isActive, watchState, actionStatuses)).toBe(WATCH_STATES.ERROR);
    });

    it('is CONFIG_ERROR when at least one action state is config error', () => {
      const isActive = true;
      const watchState = 'awaits_execution';
      const actionStatuses = [
        mockActionStatus({ state: ACTION_STATES.ACTIVE }),
        mockActionStatus({ state: ACTION_STATES.CONFIG_ERROR }),
      ];
      expect(deriveState(isActive, watchState, actionStatuses)).toBe(WATCH_STATES.CONFIG_ERROR);
    });

    it(`is INACTIVE when watch is inactive`, () => {
      const isActive = false;
      const watchState = 'awaits_execution';
      const actionStatuses = [
        mockActionStatus({ state: ACTION_STATES.ACTIVE }),
        mockActionStatus({ state: ACTION_STATES.THROTTLED }),
        mockActionStatus({ state: ACTION_STATES.ACKNOWLEDGED }),
        mockActionStatus({ state: ACTION_STATES.ERROR }),
      ];
      expect(deriveState(isActive, watchState, actionStatuses)).toBe(WATCH_STATES.INACTIVE);
    });
  });
});
