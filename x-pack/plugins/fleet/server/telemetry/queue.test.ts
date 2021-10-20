/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable dot-notation */
import { loggingSystemMock } from 'src/core/server/mocks';

import type { ESClusterInfo } from './types';
import { TelemetryQueue } from './queue';

describe('TelemetryQueue', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  describe('queueTelemetryEvents', () => {
    it('queues two events', () => {
      const queue = new TelemetryQueue(logger);
      queue.addEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }]);
      expect(queue['queue'].length).toBe(2);
    });

    it('queues more than maxQueueSize events', () => {
      const queue = new TelemetryQueue(logger);
      queue.addEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }]);
      queue['maxQueueSize'] = 5;
      queue.addEvents([{ 'event.kind': '3' }, { 'event.kind': '4' }]);
      queue.addEvents([{ 'event.kind': '5' }, { 'event.kind': '6' }]);
      queue.addEvents([{ 'event.kind': '7' }, { 'event.kind': '8' }]);
      expect(queue['queue'].length).toBe(5);
    });

    it('empties the queue when sending', async () => {
      const queue = new TelemetryQueue(logger);
      queue['send'] = jest.fn();
      queue.addEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }]);

      expect(queue['queue'].length).toBe(2);
      await queue.sendEvents('https://telemetry.elastic.co/v3/send/my-channel', {
        cluster_uuid: '1',
        cluster_name: 'cluster',
        version: {
          number: '7.16.0',
        },
      } as ESClusterInfo);
      expect(queue['queue'].length).toBe(0);
      expect(queue['send']).toHaveBeenCalledWith(
        [
          { cluster_name: 'cluster', cluster_uuid: '1', 'event.kind': '1' },
          { cluster_name: 'cluster', cluster_uuid: '1', 'event.kind': '2' },
        ],
        'https://telemetry.elastic.co/v3/send/my-channel',
        '1',
        '7.16.0'
      );
    });
  });
});
