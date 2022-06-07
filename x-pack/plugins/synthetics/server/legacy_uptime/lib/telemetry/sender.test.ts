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

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { MONITOR_UPDATE_CHANNEL } from './constants';

import { TelemetryEventsSender } from './sender';
import { LicenseGetResponse } from '@elastic/elasticsearch/lib/api/types';

jest.mock('axios', () => {
  return {
    post: jest.fn(),
  };
});

const licenseMock: LicenseGetResponse = {
  license: {
    status: 'active',
    uid: '1d34eb9f-e66f-47d1-8d24-cd60d187587a',
    type: 'trial',
    issue_date: '2022-05-05T14:25:00.732Z',
    issue_date_in_millis: 165176070074432,
    expiry_date: '2022-06-04T14:25:00.732Z',
    expiry_date_in_millis: 165435270073332,
    max_nodes: 1000,
    max_resource_units: null,
    issued_to: '2c515bd215ce444441f83ffd36a9d3d2546',
    issuer: 'elasticsearch',
    start_date_in_millis: -1,
  },
};

describe('TelemetryEventsSender', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let sender: TelemetryEventsSender;
  const sampleEvent = {
    configId: '12345',
    stackVersion: '8.1.0',
    type: 'http',
    locations: ['us_central'],
    locationsCount: 1,
    monitorNameLength: 8,
    monitorInterval: 180000,
    revision: 1,
  };

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    sender = new TelemetryEventsSender(logger);
    sender['fetchLicenseInfo'] = jest.fn(async () => {
      return licenseMock as LicenseGetResponse;
    });

    sender['fetchClusterInfo'] = jest.fn(async () => {
      return {
        cluster_uuid: '1',
        cluster_name: 'name',
        version: {
          number: '8.0.0',
        },
      } as InfoResponse;
    });
    sender.start(undefined, {
      elasticsearch: { client: { asInternalUser: { info: jest.fn(async () => ({})) } } },
    } as any);
  });

  describe('queueTelemetryEvents', () => {
    it('queues two events', () => {
      sender.queueTelemetryEvents(MONITOR_UPDATE_CHANNEL, [sampleEvent]);
      expect(sender['queuesPerChannel'][MONITOR_UPDATE_CHANNEL]).toBeDefined();
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

      sender.queueTelemetryEvents(MONITOR_UPDATE_CHANNEL, [sampleEvent]);
      sender['sendEvents'] = jest.fn();

      await sender['sendIfDue']();

      expect(sender['sendEvents']).toHaveBeenCalledWith(
        `https://telemetry-staging.elastic.co/v3-dev/send/${MONITOR_UPDATE_CHANNEL}`,
        expect.anything()
      );
    });

    it("shouldn't send when telemetry is disabled", async () => {
      const telemetryStart = {
        getIsOptedIn: jest.fn(async () => false),
      };
      sender['telemetryStart'] = telemetryStart;

      sender.queueTelemetryEvents(MONITOR_UPDATE_CHANNEL, [sampleEvent]);
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
      const requestConfig = {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'X-Elastic-Cluster-ID': '1',
          'X-Elastic-Cluster-Name': 'name',
          'X-Elastic-Stack-Version': '8.0.0',
        },
        timeout: 5000,
      };
      const event1 = { 'event.kind': '1', ...licenseMock };
      const event2 = { 'event.kind': '2', ...licenseMock };
      const event3 = { 'event.kind': '3', ...licenseMock };
      expect(axios.post).toHaveBeenCalledWith(
        'https://telemetry.elastic.co/v3/send/my-channel',
        `${JSON.stringify(event1)}\n${JSON.stringify(event2)}\n`,
        requestConfig
      );
      expect(axios.post).toHaveBeenCalledWith(
        'https://telemetry.elastic.co/v3/send/my-channel2',
        `${JSON.stringify(event3)}\n`,
        requestConfig
      );
    });
  });
});
