/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GET_UNALLOWED_FIELD_VALUES } from '../../common/constants';

import { getUnallowedFieldValues } from '../lib';

import { serverMock } from '../__mocks__/server';
import { requestMock } from '../__mocks__/request';
import { requestContextMock } from '../__mocks__/request_context';
import { getUnallowedFieldValuesRoute } from './get_unallowed_field_values';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';

jest.mock('../lib', () => ({
  getUnallowedFieldValues: jest.fn(),
}));

describe('getUnallowedFieldValuesRoute route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  let logger: MockedLogger;

  const req = requestMock.create({
    method: 'post',
    path: GET_UNALLOWED_FIELD_VALUES,
    body: [
      {
        indexName: 'auditbeat-*',
        indexFieldName: 'event.category',
        allowedValues: ['process'],
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();

    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    logger = loggerMock.create();

    getUnallowedFieldValuesRoute(server.router, logger);
  });

  test('Returns unallowedValues', async () => {
    const responses = {
      responses: [
        {
          took: 3,
          timed_out: false,
          _shards: {
            total: 1,
            successful: 1,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: {
              value: 1394,
              relation: 'eq',
            },
            max_score: null,
            hits: [],
          },
          aggregations: {
            unallowedValues: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'file',
                  doc_count: 1346,
                },
                {
                  key: 'package',
                  doc_count: 44,
                },
                {
                  key: 'host',
                  doc_count: 4,
                },
              ],
            },
          },
          status: 200,
        },
      ],
    };
    (getUnallowedFieldValues as jest.Mock).mockResolvedValue({
      responses,
      took: 3,
    });

    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(responses);
  });

  test('Handles error', async () => {
    const errorMessage = 'Error!';
    (getUnallowedFieldValues as jest.Mock).mockRejectedValue({ message: errorMessage });

    const response = await server.inject(req, requestContextMock.convertContext(context));
    expect(response.status).toEqual(500);
    expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
  });
});

describe('request validation', () => {
  let server: ReturnType<typeof serverMock.create>;
  let logger: MockedLogger;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();

    getUnallowedFieldValuesRoute(server.router, logger);
  });

  test('disallows invalid pattern', () => {
    const request = requestMock.create({
      method: 'post',
      path: GET_UNALLOWED_FIELD_VALUES,
      body: [
        {
          indexFieldName: 'event.category',
          allowedValues: [{ name: 'process' }],
        },
      ],
    });
    const result = server.validate(request);

    expect(result.badRequest).toHaveBeenCalled();
  });
});
