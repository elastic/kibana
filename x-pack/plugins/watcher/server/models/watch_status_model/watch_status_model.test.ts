/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

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
    it(`throws an error if no 'id' property in json`, () => {
      expect(() => {
        // @ts-ignore
        buildServerWatchStatusModel({});
      }).toThrow(/must contain an id property/i);
    });

    it(`throws an error if no 'watchStatusJson' property in json`, () => {
      expect(() => {
        // @ts-ignore
        buildServerWatchStatusModel({ id: 'test ' });
      }).toThrow(/must contain a watchStatusJson property/i);
    });

    it('returns correct object for use by Kibana server', () => {
      const serverWatchStatusModel = buildServerWatchStatusModel(upstreamJson);

      expect(serverWatchStatusModel.id).toBe(upstreamJson.id);
      expect(serverWatchStatusModel.watchStatusJson).toEqual(upstreamJson.watchStatusJson);
      expect(serverWatchStatusModel.isActive).toEqual(true);
      expect(serverWatchStatusModel.lastChecked).toEqual(
        moment(upstreamJson.watchStatusJson.last_checked)
      );
      expect(serverWatchStatusModel.lastMetCondition).toEqual(
        moment(upstreamJson.watchStatusJson.last_met_condition)
      );

      expect(serverWatchStatusModel.actionStatuses!.length).toBe(2);

      // TODO: Test for lastCheckedRawFormat, lastExecutionRawFormat, lastAcknowledged,
      // and lastExecution, which are all Moment instances.
      expect(serverWatchStatusModel.actionStatuses![0]).toMatchObject({
        id: 'foo',
        actionStatusJson: {
          ack: {
            state: 'awaits_successful_execution',
            timestamp: '2015-05-26T18:21:08.630Z',
          },
          last_execution: {
            successful: true,
            timestamp: '2017-07-05T00:00:00.000Z',
          },
        },
        errors: undefined,
        lastExecutionSuccessful: true,
        lastExecutionReason: undefined,
        lastThrottled: null,
        lastSuccessfulExecution: null,
      });

      expect(serverWatchStatusModel.actionStatuses![1]).toMatchObject({
        id: 'bar',
        actionStatusJson: {
          ack: {
            state: 'awaits_successful_execution',
            timestamp: '2015-05-26T18:21:08.630Z',
          },
          last_execution: {
            successful: true,
            timestamp: '2017-07-05T00:00:00.000Z',
          },
        },
        errors: undefined,
        lastExecutionSuccessful: true,
        lastExecutionReason: undefined,
        lastThrottled: null,
        lastSuccessfulExecution: null,
      });
    });
  });

  describe('buildClientWatchStatusModel', () => {
    it('returns correct object for use by Kibana client', () => {
      const serverWatchStatusModel = buildServerWatchStatusModel(upstreamJson);
      const clientWatchStatusModel = buildClientWatchStatusModel(serverWatchStatusModel);
      expect(serverWatchStatusModel.id).toBe(clientWatchStatusModel.id);
      expect(serverWatchStatusModel.isActive).toBe(clientWatchStatusModel.isActive);
      expect(serverWatchStatusModel.lastChecked).toBe(clientWatchStatusModel.lastChecked);
      expect(serverWatchStatusModel.lastMetCondition).toBe(clientWatchStatusModel.lastMetCondition);
      expect(
        clientWatchStatusModel.actionStatuses && clientWatchStatusModel.actionStatuses.length
      ).toBe(2);
    });
  });
});
