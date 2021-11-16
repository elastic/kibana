/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable dot-notation */

import { URL } from 'url';

import axios from 'axios';

import type { InfoResponse } from '@elastic/elasticsearch/lib/api/types';

import { loggingSystemMock } from 'src/core/server/mocks';

import { UpdateEventType } from '../services/upgrade_sender';

import { TelemetryEventsSender } from './sender';

jest.mock('axios', () => {
  return {
    post: jest.fn(),
  };
});

describe('TelemetryEventsSender', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let sender: TelemetryEventsSender;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    sender = new TelemetryEventsSender(logger);
    sender.start(undefined, {
      elasticsearch: { client: { asInternalUser: { info: jest.fn(async () => ({})) } } },
    } as any);
  });

  describe('queueTelemetryEvents', () => {
    it('queues two events', () => {
      sender.queueTelemetryEvents('fleet-upgrades', [
        {
          packageName: 'system',
          currentVersion: '0.3',
          newVersion: '1.0',
          status: 'success',
          eventType: UpdateEventType.PACKAGE_POLICY_UPGRADE,
        },
      ]);
      expect(sender['queuesPerChannel']['fleet-upgrades']).toBeDefined();
    });

    it('should send events when due', async () => {
      sender['telemetryStart'] = {
        getIsOptedIn: jest.fn(async () => true),
      };
      sender['telemetrySetup'] = {
        getTelemetryUrl: jest.fn(
          async () => new URL('https://telemetry-staging.elastic.co/v3/send/snapshot')
        ),
      };

      sender.queueTelemetryEvents('fleet-upgrades', [
        {
          packageName: 'apache',
          currentVersion: '0.3',
          newVersion: '1.0',
          status: 'success',
          eventType: UpdateEventType.PACKAGE_POLICY_UPGRADE,
        },
      ]);
      sender['sendEvents'] = jest.fn();

      await sender['sendIfDue']();

      expect(sender['sendEvents']).toHaveBeenCalledWith(
        'https://telemetry-staging.elastic.co/v3/send/fleet-upgrades',
        undefined,
        expect.anything()
      );
    });

    it("shouldn't send when telemetry is disabled", async () => {
      const telemetryStart = {
        getIsOptedIn: jest.fn(async () => false),
      };
      sender['telemetryStart'] = telemetryStart;

      sender.queueTelemetryEvents('fleet-upgrades', [
        {
          packageName: 'system',
          currentVersion: '0.3',
          newVersion: '1.0',
          status: 'success',
          eventType: UpdateEventType.PACKAGE_POLICY_UPGRADE,
        },
      ]);
      sender['sendEvents'] = jest.fn();

      await sender['sendIfDue']();

      expect(sender['sendEvents']).toBeCalledTimes(0);
    });

    it('should send events to separate channels', async () => {
      sender['telemetryStart'] = {
        getIsOptedIn: jest.fn(async () => true),
      };
      sender['telemetrySetup'] = {
        getTelemetryUrl: jest.fn(
          async () => new URL('https://telemetry.elastic.co/v3/send/snapshot')
        ),
      };

      sender['fetchClusterInfo'] = jest.fn(async () => {
        return {
          cluster_uuid: '1',
          cluster_name: 'name',
          version: {
            number: '8.0.0',
          },
        } as InfoResponse;
      });

      const myChannelEvents = [{ 'event.kind': '1' }, { 'event.kind': '2' }];
      // @ts-ignore
      sender.queueTelemetryEvents('my-channel', myChannelEvents);
      sender['queuesPerChannel']['my-channel']['getEvents'] = jest.fn(() => myChannelEvents);

      expect(sender['queuesPerChannel']['my-channel']['queue'].length).toBe(2);

      const myChannel2Events = [{ 'event.kind': '3' }];
      // @ts-ignore
      sender.queueTelemetryEvents('my-channel2', myChannel2Events);
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
        '{"event.kind":"1"}\n{"event.kind":"2"}\n',
        headers
      );
      expect(axios.post).toHaveBeenCalledWith(
        'https://telemetry.elastic.co/v3/send/my-channel2',
        '{"event.kind":"3"}\n',
        headers
      );
    });
  });
});
