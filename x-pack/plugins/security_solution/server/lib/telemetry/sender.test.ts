/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable dot-notation */
import { TelemetryEventsSender } from './sender';
import { loggingSystemMock } from 'src/core/server/mocks';
import { usageCountersServiceMock } from 'src/plugins/usage_collection/server/usage_counters/usage_counters_service.mock';
import { URL } from 'url';

describe('TelemetryEventsSender', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const usageCountersServiceSetup = usageCountersServiceMock.createSetupContract();
  const telemetryUsageCounter = usageCountersServiceSetup.createUsageCounter(
    'testTelemetryUsageCounter'
  );

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  describe('processEvents', () => {
    it('returns empty array when empty array is passed', () => {
      const sender = new TelemetryEventsSender(logger);
      const result = sender.processEvents([]);
      expect(result).toStrictEqual([]);
    });

    it('applies the allowlist', () => {
      const sender = new TelemetryEventsSender(logger);
      const input = [
        {
          event: {
            kind: 'alert',
            id: 'test',
          },
          dns: {
            question: {
              name: 'test-dns',
            },
          },
          agent: {
            name: 'test',
          },
          rule: {
            id: 'X',
            name: 'Y',
            ruleset: 'Z',
            version: '100',
          },
          file: {
            extension: '.exe',
            size: 3,
            created: 0,
            path: 'X',
            test: 'me',
            another: 'nope',
            Ext: {
              compressed_bytes: 'data up to 4mb',
              compressed_bytes_present: 'data up to 4mb',
              code_signature: {
                key1: 'X',
                key2: 'Y',
              },
              malware_classification: {
                key1: 'X',
              },
              malware_signature: {
                key1: 'X',
              },
              header_bytes: 'data in here',
              quarantine_result: true,
              quarantine_message: 'this file is bad',
              something_else: 'nope',
            },
          },
          host: {
            os: {
              name: 'windows',
            },
            something_else: 'nope',
          },
          process: {
            name: 'foo.exe',
            nope: 'nope',
            executable: null, // null fields are never allowlisted
            working_directory: '/some/usr/dir',
            entity_id: 'some_entity_id',
          },
          Responses: '{ "result": 0 }', // >= 7.15
          Target: {
            process: {
              name: 'bar.exe',
              nope: 'nope',
              thread: {
                id: 1234,
              },
            },
          },
          threat: {
            ignored_object: true, // this field is not allowlisted
          },
        },
      ];

      const result = sender.processEvents(input);
      expect(result).toStrictEqual([
        {
          event: {
            kind: 'alert',
            id: 'test',
          },
          dns: {
            question: {
              name: 'test-dns',
            },
          },
          agent: {
            name: 'test',
          },
          rule: {
            id: 'X',
            name: 'Y',
            ruleset: 'Z',
            version: '100',
          },
          file: {
            extension: '.exe',
            size: 3,
            created: 0,
            path: 'X',
            Ext: {
              compressed_bytes: 'data up to 4mb',
              compressed_bytes_present: 'data up to 4mb',
              code_signature: {
                key1: 'X',
                key2: 'Y',
              },
              header_bytes: 'data in here',
              malware_classification: {
                key1: 'X',
              },
              malware_signature: {
                key1: 'X',
              },
              quarantine_result: true,
              quarantine_message: 'this file is bad',
            },
          },
          host: {
            os: {
              name: 'windows',
            },
          },
          process: {
            name: 'foo.exe',
            working_directory: '/some/usr/dir',
            entity_id: 'some_entity_id',
          },
          Responses: '{ "result": 0 }',
          Target: {
            process: {
              name: 'bar.exe',
              thread: {
                id: 1234,
              },
            },
          },
        },
      ]);
    });
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
