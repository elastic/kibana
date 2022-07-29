/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { ACTION_STATES, WATCH_STATES, WATCH_STATE_COMMENTS } from '../../../common/constants';
import { buildServerWatchStatusModel, buildClientWatchStatusModel } from './watch_status_model';

describe('WatchStatusModel', () => {
  describe('fromUpstreamJson factory method', () => {
    let upstreamJson: any; // TODO
    beforeEach(() => {
      upstreamJson = {
        id: 'my-watch',
        watchStatusJson: {
          state: {
            active: true,
          },
          last_checked: '2017-03-02T14:25:31.139Z',
          last_met_condition: '2017-07-05T14:25:31.139Z',
          actions: {
            foo: {},
            bar: {},
          },
        },
      };
    });

    it(`throws an error if no 'id' property in json`, () => {
      delete upstreamJson.id;
      expect(() => {
        buildServerWatchStatusModel(upstreamJson);
      }).toThrow(/must contain an id property/i);
    });

    it(`throws an error if no 'watchStatusJson' property in json`, () => {
      delete upstreamJson.watchStatusJson;
      expect(() => {
        buildServerWatchStatusModel(upstreamJson);
      }).toThrow(/must contain a watchStatusJson property/i);
    });

    it('returns correct WatchStatus instance', () => {
      const watchStatus = buildServerWatchStatusModel(upstreamJson);

      expect(watchStatus.id).toBe(upstreamJson.id);
      expect(watchStatus.watchStatusJson).toEqual(upstreamJson.watchStatusJson);
      expect(watchStatus.isActive).toEqual(true);
      expect(watchStatus.lastChecked).toEqual(moment(upstreamJson.watchStatusJson.last_checked));
      expect(watchStatus.lastMetCondition).toEqual(
        moment(upstreamJson.watchStatusJson.last_met_condition)
      );
      expect(watchStatus.actionStatuses && watchStatus.actionStatuses.length).toBe(2);

      expect(watchStatus.actionStatuses && watchStatus.actionStatuses[0].constructor.name).toBe(
        'ActionStatusModel'
      );
      expect(watchStatus.actionStatuses && watchStatus.actionStatuses[1].constructor.name).toBe(
        'ActionStatusModel'
      );
    });
  });

  describe('lastFired getter method', () => {
    let upstreamJson: any; // TODO
    beforeEach(() => {
      upstreamJson = {
        id: 'my-watch',
        watchStatusJson: {
          state: {
            active: true,
          },
          actions: {
            foo: {
              ack: {
                timestamp: '2015-05-26T18:21:08.630Z',
                state: 'awaits_successful_execution',
              },
              last_execution: {
                timestamp: '2017-07-05T00:00:00.000Z',
              },
            },
            bar: {
              ack: {
                timestamp: '2015-05-26T18:21:08.630Z',
                state: 'awaits_successful_execution',
              },
              last_execution: {
                timestamp: '2025-07-05T00:00:00.000Z',
              },
            },
            baz: {
              ack: {
                timestamp: '2015-05-26T18:21:08.630Z',
                state: 'awaits_successful_execution',
              },
            },
          },
        },
      };
    });

    it(`returns the latest lastExecution from it's actions`, () => {
      const watchStatus = buildClientWatchStatusModel(buildServerWatchStatusModel(upstreamJson));
      expect(watchStatus.lastFired).toEqual(
        moment(upstreamJson.watchStatusJson.actions.bar.last_execution.timestamp)
      );
    });
  });

  describe('comment getter method', () => {
    let upstreamJson: any; // TODO
    beforeEach(() => {
      upstreamJson = {
        id: 'my-watch',
        watchStatusJson: {
          state: {
            active: true,
          },
        },
      };
    });

    it(`correctly calculates WATCH_STATE_COMMENTS.OK there are no actions`, () => {
      const watchStatus = buildClientWatchStatusModel(buildServerWatchStatusModel(upstreamJson));
      watchStatus.isActive = true;
      expect(watchStatus.comment).toBe(WATCH_STATE_COMMENTS.OK);
    });

    it(`correctly calculates WATCH_STATE_COMMENTS.PARTIALLY_THROTTLED`, () => {
      const watchStatus = buildServerWatchStatusModel(upstreamJson);

      watchStatus.actionStatuses = [
        { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.FIRING, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.OK, lastExecution: 0, downstreamJson: '' },
      ];
      const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
      expect(watchStatusModelJson.comment).toBe(WATCH_STATE_COMMENTS.PARTIALLY_THROTTLED);
    });

    it(`correctly calculates WATCH_STATE_COMMENTS.THROTTLED`, () => {
      const watchStatus = buildServerWatchStatusModel(upstreamJson);

      watchStatus.actionStatuses = [
        { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
      ];
      const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
      expect(watchStatusModelJson.comment).toBe(WATCH_STATE_COMMENTS.THROTTLED);
    });

    it(`correctly calculates WATCH_STATE_COMMENTS.PARTIALLY_ACKNOWLEDGED`, () => {
      const watchStatus = buildServerWatchStatusModel(upstreamJson);

      watchStatus.actionStatuses = [
        { state: ACTION_STATES.ACKNOWLEDGED, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.OK, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.FIRING, lastExecution: 0, downstreamJson: '' },
      ];
      const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
      expect(watchStatusModelJson.comment).toBe(WATCH_STATE_COMMENTS.PARTIALLY_ACKNOWLEDGED);
    });

    it(`correctly calculates WATCH_STATE_COMMENTS.ACKNOWLEDGED`, () => {
      const watchStatus = buildServerWatchStatusModel(upstreamJson);

      watchStatus.actionStatuses = [
        { state: ACTION_STATES.ACKNOWLEDGED, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.ACKNOWLEDGED, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.ACKNOWLEDGED, lastExecution: 0, downstreamJson: '' },
      ];
      const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
      expect(watchStatusModelJson.comment).toBe(WATCH_STATE_COMMENTS.ACKNOWLEDGED);
    });

    it(`correctly calculates WATCH_STATE_COMMENTS.FAILING`, () => {
      const watchStatus = buildServerWatchStatusModel(upstreamJson);

      watchStatus.actionStatuses = [
        { state: ACTION_STATES.OK, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.ACKNOWLEDGED, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.FIRING, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.ERROR, lastExecution: 0, downstreamJson: '' },
      ];

      const watchStatuusModelJson = buildClientWatchStatusModel(watchStatus);
      expect(watchStatuusModelJson.comment).toBe(WATCH_STATE_COMMENTS.FAILING);
    });

    it(`correctly calculates WATCH_STATE_COMMENTS.OK when watch is inactive`, () => {
      const watchStatus = buildClientWatchStatusModel(buildServerWatchStatusModel(upstreamJson));
      watchStatus.isActive = false;

      watchStatus.actionStatuses = [
        { state: ACTION_STATES.OK },
        { state: ACTION_STATES.ACKNOWLEDGED },
        { state: ACTION_STATES.THROTTLED },
        { state: ACTION_STATES.FIRING },
        { state: ACTION_STATES.ERROR },
      ];

      expect(watchStatus.comment).toBe(WATCH_STATE_COMMENTS.OK);
    });
  });

  describe('state getter method', () => {
    let upstreamJson: any; // TODO
    beforeEach(() => {
      upstreamJson = {
        id: 'my-watch',
        watchStatusJson: {
          state: {
            active: true,
          },
        },
      };
    });

    it(`correctly calculates WATCH_STATES.OK there are no actions`, () => {
      const watchStatus = buildServerWatchStatusModel(upstreamJson);
      // watchStatus.isActive = true;
      const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
      expect(watchStatusModelJson.state).toBe(WATCH_STATES.OK);
    });

    it(`correctly calculates WATCH_STATES.FIRING`, () => {
      const watchStatus = buildServerWatchStatusModel(upstreamJson);

      watchStatus.actionStatuses = [
        { state: ACTION_STATES.OK, lastExecution: 0, downstreamJson: {} },
        { state: ACTION_STATES.FIRING, lastExecution: 0, downstreamJson: {} },
      ];

      let watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
      expect(watchStatusModelJson.state).toBe(WATCH_STATES.FIRING);

      watchStatus.actionStatuses = [
        { state: ACTION_STATES.OK, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.FIRING, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
      ];

      watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
      expect(watchStatusModelJson.state).toBe(WATCH_STATES.FIRING);

      watchStatus.actionStatuses = [
        { state: ACTION_STATES.OK, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.FIRING, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.ACKNOWLEDGED, lastExecution: 0, downstreamJson: '' },
      ];

      watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
      expect(watchStatusModelJson.state).toBe(WATCH_STATES.FIRING);
    });

    it(`correctly calculates WATCH_STATES.ERROR`, () => {
      const watchStatus = buildServerWatchStatusModel(upstreamJson);

      watchStatus.actionStatuses = [
        { state: ACTION_STATES.OK, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.FIRING, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.ACKNOWLEDGED, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.ERROR, lastExecution: 0, downstreamJson: '' },
      ];

      const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
      expect(watchStatusModelJson.state).toBe(WATCH_STATES.ERROR);
    });

    it('correctly calculates WATCH_STATE.CONFIG_ERROR', () => {
      const watchStatus = buildServerWatchStatusModel(upstreamJson);

      watchStatus.actionStatuses = [
        { state: ACTION_STATES.OK, lastExecution: 0, downstreamJson: '' },
        { state: ACTION_STATES.CONFIG_ERROR, lastExecution: 0, downstreamJson: '' },
      ];

      const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
      expect(watchStatusModelJson.state).toBe(WATCH_STATES.CONFIG_ERROR);
    });

    it(`correctly calculates WATCH_STATES.DISABLED when watch is inactive`, () => {
      const watchStatus = buildServerWatchStatusModel(upstreamJson);
      watchStatus.isActive = false;
      const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);

      watchStatusModelJson.actionStatuses = [
        { state: ACTION_STATES.OK },
        { state: ACTION_STATES.FIRING },
        { state: ACTION_STATES.THROTTLED },
        { state: ACTION_STATES.ACKNOWLEDGED },
        { state: ACTION_STATES.ERROR },
      ];

      expect(watchStatusModelJson.state).toBe(WATCH_STATES.DISABLED);
    });
  });

  describe('downstreamJson getter method', () => {
    let upstreamJson: any; // TODO
    beforeEach(() => {
      upstreamJson = {
        id: 'my-watch',
        watchStatusJson: {
          state: {
            active: true,
          },
          last_checked: '2017-03-02T14:25:31.139Z',
          last_met_condition: '2017-07-05T14:25:31.139Z',
          actions: {
            foo: {
              ack: {
                timestamp: '2015-05-26T18:21:08.630Z',
                state: 'awaits_successful_execution',
              },
            },
            bar: {
              ack: {
                timestamp: '2015-05-26T18:21:08.630Z',
                state: 'awaits_successful_execution',
              },
            },
          },
        },
      };
    });

    it('returns correct downstream JSON object', () => {
      const watchStatus = buildServerWatchStatusModel(upstreamJson);
      const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
      watchStatusModelJson.actionStatuses = [
        { id: 'foo', state: ACTION_STATES.OK },
        { id: 'bar', state: ACTION_STATES.OK },
      ];

      expect(watchStatus.id).toBe(watchStatusModelJson.id);
      expect(watchStatus.isActive).toBe(watchStatusModelJson.isActive);
      expect(watchStatus.lastChecked).toBe(watchStatus.lastChecked);
      expect(watchStatus.lastMetCondition).toBe(watchStatusModelJson.lastMetCondition);
      expect(watchStatus.actionStatuses && watchStatus.actionStatuses.length).toBe(2);
    });
  });
});
