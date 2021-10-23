/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable dot-notation */
import { URL } from 'url';

import { loggingSystemMock } from 'src/core/server/mocks';

import axios from 'axios';

import { TelemetryEventsSender } from './sender';
import type { ESClusterInfo } from './types';

jest.mock('axios', () => {
  return {
    post: jest.fn(),
  };
});

describe('TelemetryEventsSender', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  describe('queueTelemetryEvents', () => {
    it('queues two events', () => {
      const sender = new TelemetryEventsSender(logger);
      sender.queueTelemetryEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }], 'my-channel');
      expect(sender['queuesPerChannel']['my-channel']).toBeDefined();
    });

    it('should send events when due', async () => {
      const sender = new TelemetryEventsSender(logger);
      sender['telemetryStart'] = {
        getIsOptedIn: jest.fn(async () => true),
      };
      sender['telemetrySetup'] = {
        getTelemetryUrl: jest.fn(
          async () => new URL('https://telemetry-staging.elastic.co/v3/send/snapshot')
        ),
      };

      sender.queueTelemetryEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }], 'my-channel');
      sender['sendEvents'] = jest.fn();

      await sender['sendIfDue']();

      expect(sender['sendEvents']).toHaveBeenCalledWith(
        'https://telemetry-staging.elastic.co/v3/send/my-channel',
        undefined,
        expect.anything()
      );
    });

    it("shouldn't send when telemetry is disabled", async () => {
      const sender = new TelemetryEventsSender(logger);
      const telemetryStart = {
        getIsOptedIn: jest.fn(async () => false),
      };
      sender['telemetryStart'] = telemetryStart;

      sender.queueTelemetryEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }], 'my-channel');
      sender['sendEvents'] = jest.fn();

      await sender['sendIfDue']();

      expect(sender['sendEvents']).toBeCalledTimes(0);
    });

    it('should send events to separate channels', async () => {
      const sender = new TelemetryEventsSender(logger);
      sender['telemetryStart'] = {
        getIsOptedIn: jest.fn(async () => true),
      };
      sender['telemetrySetup'] = {
        getTelemetryUrl: jest.fn(
          async () => new URL('https://telemetry.elastic.co/v3/send/snapshot')
        ),
      };
      sender['receiver'] = {
        start: jest.fn(),
        fetchClusterInfo: jest.fn(async () => {
          return {
            cluster_uuid: '1',
            cluster_name: 'name',
            version: {
              number: '8.0.0',
            },
          } as ESClusterInfo;
        }),
      };

      const myChannelEvents = [{ 'event.kind': '1' }, { 'event.kind': '2' }];
      sender.queueTelemetryEvents(myChannelEvents, 'my-channel');
      sender['queuesPerChannel']['my-channel']['getEvents'] = jest.fn(() => myChannelEvents);

      expect(sender['queuesPerChannel']['my-channel']['queue'].length).toBe(2);

      const myChannel2Events = [{ 'event.kind': '3' }];
      sender.queueTelemetryEvents(myChannel2Events, 'my-channel2');
      sender['queuesPerChannel']['my-channel2']['getEvents'] = jest.fn(() => myChannel2Events);

      expect(sender['queuesPerChannel']['my-channel2']['queue'].length).toBe(1);

      await sender['sendIfDue']();

      expect(sender['queuesPerChannel']['my-channel']['getEvents']).toBeCalledTimes(1);
      expect(sender['queuesPerChannel']['my-channel2']['getEvents']).toBeCalledTimes(1);
      const headers = {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'X-Elastic-Cluster-ID': '1',
          'X-Elastic-Stack-Version': '8.0.0',
        },
      };
      expect(axios.post).toHaveBeenCalledWith(
        'https://telemetry.elastic.co/v3/send/my-channel',
        '{"event.kind":"1","cluster_uuid":"1","cluster_name":"name"}\n{"event.kind":"2","cluster_uuid":"1","cluster_name":"name"}\n',
        headers
      );
      expect(axios.post).toHaveBeenCalledWith(
        'https://telemetry.elastic.co/v3/send/my-channel2',
        '{"event.kind":"3","cluster_uuid":"1","cluster_name":"name"}\n',
        headers
      );
    });
  });
});
