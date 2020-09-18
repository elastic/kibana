/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable dot-notation */
import { TelemetryEventsSender } from './sender';
import { loggingSystemMock } from 'src/core/server/mocks';

describe('TelemetryEventsSender', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

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
            something_else: 'nope',
          },
          agent: {
            name: 'test',
          },
          file: {
            size: 3,
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
              something_else: 'nope',
            },
          },
          host: {
            os: {
              name: 'windows',
            },
            something_else: 'nope',
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
          file: {
            size: 3,
            path: 'X',
            Ext: {
              code_signature: {
                key1: 'X',
                key2: 'Y',
              },
              malware_classification: {
                key1: 'X',
              },
            },
          },
          host: {
            os: {
              name: 'windows',
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
      sender['sendEvents'] = jest.fn();
      const telemetryStart = {
        getIsOptedIn: jest.fn(async () => true),
      };
      sender['telemetryStart'] = telemetryStart;

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
