/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { ACTION_STATES, WATCH_STATES, WATCH_STATE_COMMENTS } from '../../../common/constants';
import { WatchStatusUpstreamJson } from '../../../common/types';
import { buildServerWatchStatusModel, buildClientWatchStatusModel } from './watch_status_model';

const upstreamJson: WatchStatusUpstreamJson = {
  id: 'my-watch',
  watchStatusJson: {
    version: 1,
    state: {
      active: true,
      timestamp: '2017-03-02T14:25:31.139Z',
    },
    last_checked: '2017-03-02T14:25:31.139Z',
    last_met_condition: '2017-07-05T14:25:31.139Z',
    actions: {
      foo: {
        ack: {
          timestamp: '2015-05-26T18:21:08.630Z',
          state: 'awaits_successful_execution',
        },
        last_execution: {
          timestamp: '2017-07-05T00:00:00.000Z',
          successful: true,
        },
      },
      bar: {
        ack: {
          timestamp: '2015-05-26T18:21:08.630Z',
          state: 'awaits_successful_execution',
        },
        last_execution: {
          timestamp: '2017-07-05T00:00:00.000Z',
          successful: true,
        },
      },
    },
  },
};

describe('WatchStatusModel', () => {
  describe('buildServerWatchStatusModel', () => {
    it('returns correct object for use by Kibana server', () => {
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

  describe('buildClientWatchStatusModel', () => {
    it('returns correct object for use by Kibana client', () => {
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

  describe('derived properties', () => {
    describe('lastFired', () => {
      it(`is the latest lastExecution from the watch status's actions`, () => {
        const watchStatus = buildClientWatchStatusModel(buildServerWatchStatusModel(upstreamJson));
        expect(watchStatus.lastFired).toEqual(
          moment(upstreamJson.watchStatusJson.actions.bar.last_execution?.timestamp)
        );
      });
    });

    describe('comment', () => {
      it(`is OK when there are no actions`, () => {
        const watchStatus = buildClientWatchStatusModel(buildServerWatchStatusModel(upstreamJson));
        watchStatus.isActive = true;
        expect(watchStatus.comment).toBe(WATCH_STATE_COMMENTS.OK);
      });

      it(`is PARTIALLY_THROTTLED when some action states are throttled and others aren't`, () => {
        const watchStatus = buildServerWatchStatusModel(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
          { state: ACTION_STATES.FIRING, lastExecution: 0, downstreamJson: '' },
          { state: ACTION_STATES.OK, lastExecution: 0, downstreamJson: '' },
        ];
        const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
        expect(watchStatusModelJson.comment).toBe(WATCH_STATE_COMMENTS.PARTIALLY_THROTTLED);
      });

      it(`is THROTTLED when all action states are throttled`, () => {
        const watchStatus = buildServerWatchStatusModel(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
          { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
          { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
        ];
        const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
        expect(watchStatusModelJson.comment).toBe(WATCH_STATE_COMMENTS.THROTTLED);
      });

      it(`is PARTIALLY_ACKNOWLEDGED when some action states are acknowledged and others arne't`, () => {
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

      it(`is ACKNOWLEDGED when all action states are acknowledged`, () => {
        const watchStatus = buildServerWatchStatusModel(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.ACKNOWLEDGED, lastExecution: 0, downstreamJson: '' },
          { state: ACTION_STATES.ACKNOWLEDGED, lastExecution: 0, downstreamJson: '' },
          { state: ACTION_STATES.ACKNOWLEDGED, lastExecution: 0, downstreamJson: '' },
        ];
        const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
        expect(watchStatusModelJson.comment).toBe(WATCH_STATE_COMMENTS.ACKNOWLEDGED);
      });

      it(`is FAILING when one action state is failing`, () => {
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

      it(`is OK when watch is inactive`, () => {
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

    describe('state', () => {
      it(`is OK there are no actions`, () => {
        const watchStatus = buildServerWatchStatusModel(upstreamJson);
        watchStatus.isActive = true;
        const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
        expect(watchStatusModelJson.state).toBe(WATCH_STATES.OK);
      });

      it(`is FIRING when at least one action state is firing`, () => {
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

      it(`is ERROR when at least one action state is error`, () => {
        const watchStatus = buildServerWatchStatusModel(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.OK, lastExecution: 0, downstreamJson: '' },
          { state: ACTION_STATES.FIRING, lastExecution: 0, downstreamJson: '' },
          { state: ACTION_STATES.THROTTLED, lastExecution: 0, downstreamJson: '' },
          { state: ACTION_STATES.ACKNOWLEDGED, lastExecution: 0, downstreamJson: '' },
          { state: ACTION_STATES.ERROR, lastExecution: 0, downstreamJson: '' },
          { state: ACTION_STATES.CONFIG_ERROR, lastExecution: 0, downstreamJson: '' },
        ];

        const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
        expect(watchStatusModelJson.state).toBe(WATCH_STATES.ERROR);
      });

      it('is CONFIG_ERROR when at least one action state is config error', () => {
        const watchStatus = buildServerWatchStatusModel(upstreamJson);

        watchStatus.actionStatuses = [
          { state: ACTION_STATES.OK, lastExecution: 0, downstreamJson: '' },
          { state: ACTION_STATES.CONFIG_ERROR, lastExecution: 0, downstreamJson: '' },
        ];

        const watchStatusModelJson = buildClientWatchStatusModel(watchStatus);
        expect(watchStatusModelJson.state).toBe(WATCH_STATES.CONFIG_ERROR);
      });

      it(`is DISABLED when watch is inactive`, () => {
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
  });
});
