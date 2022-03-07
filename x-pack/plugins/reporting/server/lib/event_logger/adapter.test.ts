/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogMeta } from 'kibana/server';
import { loggingSystemMock } from 'src/core/server/mocks';
import { EcsLogAdapter } from './adapter';

describe('EcsLogAdapter', () => {
  const logger = loggingSystemMock.createLogger();
  beforeAll(() => {
    jest
      .spyOn(global.Date, 'now')
      .mockImplementationOnce(() => new Date('2021-04-12T16:00:00.000Z').valueOf())
      .mockImplementationOnce(() => new Date('2021-04-12T16:02:00.000Z').valueOf());
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('captures a log event', () => {
    const eventLogger = new EcsLogAdapter(logger, { event: { provider: 'test-adapting' } });

    const event = { kibana: { reporting: { wins: 5000 } } } as object & LogMeta; // an object that extends LogMeta
    eventLogger.logEvent('hello world', event);

    expect(logger.debug).toBeCalledWith('hello world', {
      event: {
        duration: undefined,
        end: undefined,
        provider: 'test-adapting',
        start: undefined,
      },
      kibana: {
        reporting: {
          wins: 5000,
        },
      },
    });
  });

  it('captures timings between start and complete', () => {
    const eventLogger = new EcsLogAdapter(logger, { event: { provider: 'test-adapting' } });
    eventLogger.startTiming();

    const event = { kibana: { reporting: { wins: 9000 } } } as object & LogMeta; // an object that extends LogMeta
    eventLogger.logEvent('hello duration', event);

    expect(logger.debug).toBeCalledWith('hello duration', {
      event: {
        duration: 120000000000,
        end: '2021-04-12T16:02:00.000Z',
        provider: 'test-adapting',
        start: '2021-04-12T16:00:00.000Z',
      },
      kibana: {
        reporting: {
          wins: 9000,
        },
      },
    });
  });
});
