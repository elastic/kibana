/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';
import { cloneDeep } from 'lodash';

import { URL } from 'url';
import { type TelemetryEventSenderConfig, type QueueConfig } from './sender_v2.types';
import { TelemetryEventsSenderV2 } from './sender_v2';
import { TelemetryReceiver } from './receiver';
import { TelemetryChannel } from './types';
import { loggingSystemMock } from '@kbn/core/server/mocks';

jest.mock('axios');
jest.mock('./receiver');

const mockedAxiosPost = jest.spyOn(axios, 'post');
const telemetryPluginSetup = {
  getTelemetryUrl: jest.fn(() => Promise.resolve(new URL('http://localhost/v3/send'))),
};
const receiver = new TelemetryReceiver(loggingSystemMock.createLogger());
const defaultConfig: TelemetryEventSenderConfig = {
  retryConfig: {
    retryCount: 3,
    retryDelayMillis: 100,
  },
  queues: new Map<TelemetryChannel, QueueConfig>([
    [
      TelemetryChannel.INSIGHTS,
      {
        bufferTimeSpanMillis: 100,
        inflightEventsThreshold: 1000,
        maxPayloadSizeBytes: 1024 * 1024 * 1024,
      },
    ],
    [
      TelemetryChannel.LISTS,
      {
        bufferTimeSpanMillis: 1000,
        inflightEventsThreshold: 500,
        maxPayloadSizeBytes: 1024 * 1024 * 1024,
      },
    ],
    [
      TelemetryChannel.DETECTION_ALERTS,
      {
        bufferTimeSpanMillis: 5000,
        inflightEventsThreshold: 10,
        maxPayloadSizeBytes: 1024 * 1024 * 1024,
      },
    ],
  ]),
};

describe('TelemetryEventsSenderV2', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    jest.useFakeTimers({ advanceTimers: true });
    mockedAxiosPost.mockClear();
    mockedAxiosPost.mockResolvedValue({ status: 201 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('does not lose data during startup', async () => {
      const service = new TelemetryEventsSenderV2(logger);

      service.setup(defaultConfig, receiver, telemetryPluginSetup);

      service.send(TelemetryChannel.INSIGHTS, ['e1']);
      service.send(TelemetryChannel.INSIGHTS, ['e2']);

      await jest.advanceTimersByTimeAsync(10000);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(0);

      service.start();

      await jest.advanceTimersByTimeAsync(10000);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        '"e1"\n"e2"',
        expect.anything()
      );

      await service.stop();
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    });

    it('should not start without being configured', () => {
      const service = new TelemetryEventsSenderV2(logger);

      expect(() => {
        service.start();
      }).toThrow('CREATED: invalid status. Expected [CONFIGURED]');
    });

    it('should not start twice', () => {
      const service = new TelemetryEventsSenderV2(logger);

      service.setup(defaultConfig, receiver, telemetryPluginSetup);

      service.start();

      expect(() => {
        service.start();
      }).toThrow('STARTED: invalid status. Expected [CONFIGURED]');
    });

    it('should not send events if the servise is not configured', () => {
      const service = new TelemetryEventsSenderV2(logger);

      expect(() => {
        service.send(TelemetryChannel.INSIGHTS, ['hello']);
      }).toThrow('CREATED: invalid status. Expected [CONFIGURED,STARTED]');
    });
  });

  describe('simple use cases', () => {
    it('should chunk events by size', async () => {
      const service = new TelemetryEventsSenderV2(logger);

      const config = cloneDeep(defaultConfig);
      const detectionsConfig = getConfigFor(config.queues, TelemetryChannel.DETECTION_ALERTS);
      config.queues.set(TelemetryChannel.DETECTION_ALERTS, {
        ...detectionsConfig,
        maxPayloadSizeBytes: 10,
      });

      service.setup(config, receiver, telemetryPluginSetup);
      service.start();

      // at most 10 bytes per payload (after serialized to JSON): it should send
      // two posts: ["aaaaa", "b"] and ["c"]
      service.send(TelemetryChannel.DETECTION_ALERTS, ['aaaaa', 'b', 'c']);
      const expectedBodies = ['"aaaaa"\n"b"', '"c"'];

      await service.stop();

      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);

      expectedBodies.forEach((expectedBody) => {
        expect(mockedAxiosPost).toHaveBeenCalledWith(
          expect.anything(),
          expectedBody,
          expect.anything()
        );
      });
    });

    it('should chunk events by size, even if one event is bigger than `maxTelemetryPayloadSizeBytes`', async () => {
      const service = new TelemetryEventsSenderV2(logger);
      const config = cloneDeep(defaultConfig);
      const detectionsConfig: QueueConfig = getConfigFor(
        config.queues,
        TelemetryChannel.DETECTION_ALERTS
      );
      config.queues.set(TelemetryChannel.DETECTION_ALERTS, {
        ...detectionsConfig,
        maxPayloadSizeBytes: 3,
      });
      service.setup(config, receiver, telemetryPluginSetup);
      service.start();

      // at most 10 bytes per payload (after serialized to JSON): it should
      // send two posts: ["aaaaa", "b"] and ["c"]
      service.send(TelemetryChannel.DETECTION_ALERTS, ['aaaaa', 'b', 'c']);
      const expectedBodies = ['"aaaaa"', '"b"', '"c"'];

      await service.stop();

      expect(mockedAxiosPost).toHaveBeenCalledTimes(3);

      expectedBodies.forEach((expectedBody) => {
        expect(mockedAxiosPost).toHaveBeenCalledWith(
          expect.anything(),
          expectedBody,
          expect.anything()
        );
      });
    });

    it('should buffer for a specific time period', async () => {
      const bufferTimeSpanMillis = 2000;
      const config = structuredClone(defaultConfig);
      getConfigFor(config.queues, TelemetryChannel.DETECTION_ALERTS).bufferTimeSpanMillis =
        bufferTimeSpanMillis;
      const service = new TelemetryEventsSenderV2(logger);

      service.setup(config, receiver, telemetryPluginSetup);
      service.start();

      // send some events
      service.send(TelemetryChannel.DETECTION_ALERTS, ['a', 'b', 'c']);

      // advance time by less than the buffer time span
      await jest.advanceTimersByTimeAsync(bufferTimeSpanMillis * 0.2);

      // check that no events are sent before the buffer time span
      expect(mockedAxiosPost).toHaveBeenCalledTimes(0);

      // advance time by more than the buffer time span
      await jest.advanceTimersByTimeAsync(bufferTimeSpanMillis * 1.2);

      // check that the events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);

      await service.stop();

      // check that no more events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    });
  });
});

const getConfigFor = (
  queues: Map<TelemetryChannel, QueueConfig>,
  channel: TelemetryChannel
): QueueConfig => {
  const config = queues?.get(channel);
  if (config === undefined) throw new Error(`No queue config found for channel "${channel}"`);
  return config;
};
