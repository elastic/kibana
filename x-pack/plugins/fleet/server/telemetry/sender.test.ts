/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable dot-notation */
import { URL } from 'url';

import { loggingSystemMock } from 'src/core/server/mocks';

import { TelemetryEventsSender } from './sender';

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
        getTelemetryUrl: jest.fn(async () => new URL('https://telemetry.elastic.co')),
      };

      sender.queueTelemetryEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }], 'my-channel');
      sender['queuesPerChannel']['my-channel']['sendEvents'] = jest.fn();

      await sender['sendIfDue']();

      expect(sender['queuesPerChannel']['my-channel']['sendEvents']).toBeCalledTimes(1);
    });

    it("shouldn't send when telemetry is disabled", async () => {
      const sender = new TelemetryEventsSender(logger);
      const telemetryStart = {
        getIsOptedIn: jest.fn(async () => false),
      };
      sender['telemetryStart'] = telemetryStart;

      sender.queueTelemetryEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }], 'my-channel');
      sender['queuesPerChannel']['my-channel']['sendEvents'] = jest.fn();

      await sender['sendIfDue']();

      expect(sender['queuesPerChannel']['my-channel']['sendEvents']).toBeCalledTimes(0);
    });

    it('should send events to separate channels', async () => {
      const sender = new TelemetryEventsSender(logger);
      sender['telemetryStart'] = {
        getIsOptedIn: jest.fn(async () => true),
      };
      sender['telemetrySetup'] = {
        getTelemetryUrl: jest.fn(async () => new URL('https://telemetry.elastic.co')),
      };

      sender.queueTelemetryEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }], 'my-channel');
      sender['queuesPerChannel']['my-channel']['sendEvents'] = jest.fn();

      expect(sender['queuesPerChannel']['my-channel']['queue'].length).toBe(2);

      sender.queueTelemetryEvents([{ 'event.kind': '3' }], 'my-channel2');
      sender['queuesPerChannel']['my-channel2']['sendEvents'] = jest.fn();

      expect(sender['queuesPerChannel']['my-channel2']['queue'].length).toBe(1);

      await sender['sendIfDue']();

      expect(sender['queuesPerChannel']['my-channel']['sendEvents']).toBeCalledTimes(1);
      expect(sender['queuesPerChannel']['my-channel2']['sendEvents']).toBeCalledTimes(1);
    });
  });
});

describe('getV3UrlFromV2', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  it('should return prod url', () => {
    const sender = new TelemetryEventsSender(logger);
    expect(sender.getV3UrlFromV2('https://telemetry.elastic.co/xpack/v2/send', 'my-channel')).toBe(
      'https://telemetry.elastic.co/v3/send/my-channel'
    );
  });

  it('should return staging url', () => {
    const sender = new TelemetryEventsSender(logger);
    expect(
      sender.getV3UrlFromV2('https://telemetry-staging.elastic.co/xpack/v2/send', 'my-channel')
    ).toBe('https://telemetry-staging.elastic.co/v3/send/my-channel');
  });

  it('should support ports and auth', () => {
    const sender = new TelemetryEventsSender(logger);
    expect(
      sender.getV3UrlFromV2('http://user:pass@myproxy.local:1337/xpack/v2/send', 'my-channel')
    ).toBe('http://user:pass@myproxy.local:1337/v3/send/my-channel');
  });
});
