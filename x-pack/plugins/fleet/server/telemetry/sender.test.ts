/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable dot-notation */
import { URL } from 'url';

import { loggingSystemMock } from 'src/core/server/mocks';

import { usageCountersServiceMock } from 'src/plugins/usage_collection/server/usage_counters/usage_counters_service.mock';

import { TelemetryEventsSender } from './sender';

describe('TelemetryEventsSender', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const usageCountersServiceSetup = usageCountersServiceMock.createSetupContract();
  const telemetryUsageCounter = usageCountersServiceSetup.createUsageCounter(
    'testTelemetryUsageCounter'
  );

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  describe('queueTelemetryEvents', () => {
    it('queues two events', () => {
      const sender = new TelemetryEventsSender(logger);
      sender.queueTelemetryEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }]);
      expect(sender['queue'].length).toBe(2);
    });

    it('queues more than maxQueueSize events', () => {
      const sender = new TelemetryEventsSender(logger);
      sender['maxQueueSize'] = 5;
      sender.queueTelemetryEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }]);
      sender.queueTelemetryEvents([{ 'event.kind': '3' }, { 'event.kind': '4' }]);
      sender.queueTelemetryEvents([{ 'event.kind': '5' }, { 'event.kind': '6' }]);
      sender.queueTelemetryEvents([{ 'event.kind': '7' }, { 'event.kind': '8' }]);
      expect(sender['queue'].length).toBe(5);
    });

    it('empties the queue when sending', async () => {
      const sender = new TelemetryEventsSender(logger);
      sender['telemetryStart'] = {
        getIsOptedIn: jest.fn(async () => true),
      };
      sender['telemetrySetup'] = {
        getTelemetryUrl: jest.fn(async () => new URL('https://telemetry.elastic.co')),
      };
      sender['telemetryUsageCounter'] = telemetryUsageCounter;
      sender['sendEvents'] = jest.fn(async () => {
        sender['telemetryUsageCounter']?.incrementCounter({
          counterName: 'test_counter',
          counterType: 'invoked',
          incrementBy: 1,
        });
      });

      sender.queueTelemetryEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }]);
      expect(sender['queue'].length).toBe(2);
      await sender['sendIfDue']();
      expect(sender['queue'].length).toBe(0);
      expect(sender['sendEvents']).toBeCalledTimes(1);
      sender.queueTelemetryEvents([{ 'event.kind': '3' }, { 'event.kind': '4' }]);
      sender.queueTelemetryEvents([{ 'event.kind': '5' }, { 'event.kind': '6' }]);
      expect(sender['queue'].length).toBe(4);
      await sender['sendIfDue']();
      expect(sender['queue'].length).toBe(0);
      expect(sender['sendEvents']).toBeCalledTimes(2);
      expect(sender['telemetryUsageCounter'].incrementCounter).toBeCalledTimes(2);
    });

    it("shouldn't send when telemetry is disabled", async () => {
      const sender = new TelemetryEventsSender(logger);
      sender['sendEvents'] = jest.fn();
      const telemetryStart = {
        getIsOptedIn: jest.fn(async () => false),
      };
      sender['telemetryStart'] = telemetryStart;

      sender.queueTelemetryEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }]);
      expect(sender['queue'].length).toBe(2);
      await sender['sendIfDue']();

      expect(sender['queue'].length).toBe(0);
      expect(sender['sendEvents']).toBeCalledTimes(0);
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
    expect(
      sender.getV3UrlFromV2('https://telemetry.elastic.co/xpack/v2/send', 'alerts-endpoint')
    ).toBe('https://telemetry.elastic.co/v3/send/alerts-endpoint');
  });

  it('should return staging url', () => {
    const sender = new TelemetryEventsSender(logger);
    expect(
      sender.getV3UrlFromV2('https://telemetry-staging.elastic.co/xpack/v2/send', 'alerts-endpoint')
    ).toBe('https://telemetry-staging.elastic.co/v3-dev/send/alerts-endpoint');
  });

  it('should support ports and auth', () => {
    const sender = new TelemetryEventsSender(logger);
    expect(
      sender.getV3UrlFromV2('http://user:pass@myproxy.local:1337/xpack/v2/send', 'alerts-endpoint')
    ).toBe('http://user:pass@myproxy.local:1337/v3/send/alerts-endpoint');
  });
});
