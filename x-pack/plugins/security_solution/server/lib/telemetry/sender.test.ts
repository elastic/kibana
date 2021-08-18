/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable dot-notation */
import { TelemetryEventsSender, copyAllowlistedFields, getV3UrlFromV2 } from './sender';
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
          },
          Target: {
            process: {
              name: 'bar.exe',
              nope: 'nope',
              thread: {
                id: 1234,
              },
            },
          },
        },
      ];

      const result = sender.processEvents(input);
      expect(result).toStrictEqual([
        {
          event: {
            kind: 'alert',
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
          },
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
      sender['fetchClusterInfo'] = jest.fn(async () => {
        return {
          cluster_name: 'test',
          cluster_uuid: 'test-uuid',
        };
      });
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

describe('allowlistEventFields', () => {
  const allowlist = {
    a: true,
    b: true,
    c: {
      d: true,
    },
  };

  it('filters top level', () => {
    const event = {
      a: 'a',
      a1: 'a1',
      b: 'b',
      b1: 'b1',
    };
    expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
      a: 'a',
      b: 'b',
    });
  });

  it('filters nested', () => {
    const event = {
      a: {
        a1: 'a1',
      },
      a1: 'a1',
      b: {
        b1: 'b1',
      },
      b1: 'b1',
      c: {
        d: 'd',
        e: 'e',
        f: 'f',
      },
    };
    expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
      a: {
        a1: 'a1',
      },
      b: {
        b1: 'b1',
      },
      c: {
        d: 'd',
      },
    });
  });

  it('filters arrays of objects', () => {
    const event = {
      a: [
        {
          a1: 'a1',
        },
      ],
      b: {
        b1: 'b1',
      },
      c: [
        {
          d: 'd1',
          e: 'e1',
          f: 'f1',
        },
        {
          d: 'd2',
          e: 'e2',
          f: 'f2',
        },
        {
          d: 'd3',
          e: 'e3',
          f: 'f3',
        },
      ],
    };
    expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
      a: [
        {
          a1: 'a1',
        },
      ],
      b: {
        b1: 'b1',
      },
      c: [
        {
          d: 'd1',
        },
        {
          d: 'd2',
        },
        {
          d: 'd3',
        },
      ],
    });
  });

  it("doesn't create empty objects", () => {
    const event = {
      a: 'a',
      b: 'b',
      c: {
        e: 'e',
      },
    };
    expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
      a: 'a',
      b: 'b',
    });
  });
});

describe('getV3UrlFromV2', () => {
  it('should return prod url', () => {
    expect(getV3UrlFromV2('https://telemetry.elastic.co/xpack/v2/send', 'alerts-endpoint')).toBe(
      'https://telemetry.elastic.co/v3/send/alerts-endpoint'
    );
  });

  it('should return staging url', () => {
    expect(
      getV3UrlFromV2('https://telemetry-staging.elastic.co/xpack/v2/send', 'alerts-endpoint')
    ).toBe('https://telemetry-staging.elastic.co/v3-dev/send/alerts-endpoint');
  });

  it('should support ports and auth', () => {
    expect(
      getV3UrlFromV2('http://user:pass@myproxy.local:1337/xpack/v2/send', 'alerts-endpoint')
    ).toBe('http://user:pass@myproxy.local:1337/v3/send/alerts-endpoint');
  });
});
