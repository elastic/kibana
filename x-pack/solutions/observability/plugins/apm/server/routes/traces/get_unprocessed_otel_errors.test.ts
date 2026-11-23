/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  AT_TIMESTAMP,
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  ID,
  OTEL_EVENT_NAME,
  SERVICE_NAME,
  SPAN_ID,
  TIMESTAMP_US,
} from '../../../common/es_fields/apm';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
import { getUnprocessedOtelErrors } from './get_unprocessed_otel_errors';

interface Hit {
  _id?: string;
  _index?: string;
  fields?: Record<string, unknown[]>;
}

const validFields = {
  [ID]: ['error-1'],
  [SPAN_ID]: ['span-1'],
  [SERVICE_NAME]: ['my-service'],
  [AT_TIMESTAMP]: ['2023-01-01T00:00:00.000Z'],
  [OTEL_EVENT_NAME]: ['exception'],
  [EXCEPTION_TYPE]: ['NullPointerException'],
  [EXCEPTION_MESSAGE]: ['boom'],
};

function createLogsClientMock(hits: Hit[]): LogsClient {
  return {
    search: jest.fn().mockResolvedValue({ hits: { hits } }),
  } as unknown as LogsClient;
}

describe('getUnprocessedOtelErrors', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  function callGetUnprocessedOtelErrors(hits: Hit[]) {
    return getUnprocessedOtelErrors({
      logsClient: createLogsClientMock(hits),
      logger,
      traceId: 'trace-1',
      start: 0,
      end: 1000,
    });
  }

  it('returns an empty array when there are no hits', async () => {
    await expect(callGetUnprocessedOtelErrors([])).resolves.toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('maps a document that has all the required fields', async () => {
    const errors = await callGetUnprocessedOtelErrors([
      {
        _id: 'error-1',
        _index: 'logs-generic.otel-default',
        fields: { ...validFields, [TIMESTAMP_US]: [1672531200000000] },
      },
    ]);

    expect(errors).toEqual([
      {
        id: 'error-1',
        span: { id: 'span-1' },
        trace: { id: 'trace-1' },
        timestamp: { us: 1672531200000000 },
        eventName: 'exception',
        service: { name: 'my-service' },
        error: { exception: { type: 'NullPointerException', message: 'boom' } },
        index: 'logs-generic.otel-default',
      },
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('derives the timestamp from @timestamp when timestamp.us is missing', async () => {
    const errors = await callGetUnprocessedOtelErrors([
      { _id: 'error-1', _index: 'logs-generic.otel-default', fields: validFields },
    ]);

    expect(errors[0].timestamp).toEqual({ us: 1672531200000000 });
  });

  it('skips a document without fields and logs a warning', async () => {
    await expect(
      callGetUnprocessedOtelErrors([{ _id: 'error-1', _index: 'logs-generic.otel-default' }])
    ).resolves.toEqual([]);

    expect(logger.warn).toHaveBeenCalledWith(
      '[get_unprocessed_otel_errors] Skipping document with id [error-1] from index [logs-generic.otel-default]: Event has no fields'
    );
  });

  it.each([ID, SPAN_ID, SERVICE_NAME, AT_TIMESTAMP])(
    'skips a document missing %s and logs a warning',
    async (missingField) => {
      const fields = omit(validFields, missingField);

      await expect(
        callGetUnprocessedOtelErrors([
          { _id: 'error-1', _index: 'logs-generic.otel-default', fields },
        ])
      ).resolves.toEqual([]);

      expect(logger.warn).toHaveBeenCalledWith(
        `[get_unprocessed_otel_errors] Skipping document with id [error-1] from index [logs-generic.otel-default]: Missing required fields (${missingField}) in event`
      );
    }
  );

  it('returns the valid documents and skips the malformed ones', async () => {
    const errors = await callGetUnprocessedOtelErrors([
      {
        _id: 'error-1',
        _index: 'logs-generic.otel-default',
        fields: omit(validFields, SERVICE_NAME),
      },
      {
        _id: 'error-2',
        _index: 'logs-generic.otel-default',
        fields: { ...validFields, [ID]: ['error-2'] },
      },
      { _id: 'error-3', _index: 'logs-other.otel-default' },
      {
        _id: 'error-4',
        _index: 'logs-generic.otel-default',
        fields: { ...validFields, [ID]: ['error-4'], [SERVICE_NAME]: ['another-service'] },
      },
    ]);

    expect(errors.map((error) => error.id)).toEqual(['error-2', 'error-4']);
    expect(errors.map((error) => error.service.name)).toEqual(['my-service', 'another-service']);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});
