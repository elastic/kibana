/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseResponse } from '../../../../common/api';
import { createCasesClientMock } from '../../mocks';
import type { CasesClientArgs } from '../../types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createCaseServiceMock } from '../../../services/mocks';

import { MTTR } from './mttr';

const clientMock = createCasesClientMock();
const caseService = createCaseServiceMock();

const logger = loggingSystemMock.createLogger();
const getAuthorizationFilter = jest.fn().mockResolvedValue({});

const clientArgs = {
  logger,
  services: {
    caseService,
  },
  authorization: { getAuthorizationFilter },
} as unknown as CasesClientArgs;

const constructorOptions = { casesClient: clientMock, clientArgs };

describe('MTTR', () => {
  beforeAll(() => {
    getAuthorizationFilter.mockResolvedValue({});
    clientMock.cases.get.mockResolvedValue({ id: '' } as unknown as CaseResponse);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty values when no features set up', async () => {
    caseService.executeAggregations.mockResolvedValue(undefined);
    const handler = new MTTR(constructorOptions);
    expect(await handler.compute()).toEqual({});
  });

  it('returns null when aggregation returns undefined', async () => {
    caseService.executeAggregations.mockResolvedValue(undefined);
    const handler = new MTTR(constructorOptions);
    handler.setupFeature('mttr');

    expect(await handler.compute()).toEqual({ mttr: null });
  });

  it('returns null when aggregation returns empty object', async () => {
    caseService.executeAggregations.mockResolvedValue({});
    const handler = new MTTR(constructorOptions);
    handler.setupFeature('mttr');

    expect(await handler.compute()).toEqual({ mttr: null });
  });

  it('returns null when aggregation returns empty mttr object', async () => {
    caseService.executeAggregations.mockResolvedValue({ mttr: {} });
    const handler = new MTTR(constructorOptions);
    handler.setupFeature('mttr');

    expect(await handler.compute()).toEqual({ mttr: null });
  });

  it('returns values when there is a mttr value', async () => {
    caseService.executeAggregations.mockResolvedValue({ mttr: { value: 5 } });
    const handler = new MTTR(constructorOptions);
    handler.setupFeature('mttr');

    expect(await handler.compute()).toEqual({ mttr: 5 });
  });

  it('passes the query options correctly', async () => {
    caseService.executeAggregations.mockResolvedValue({ mttr: { value: 5 } });
    const handler = new MTTR({
      ...constructorOptions,
      from: '2022-04-28T15:18:00.000Z',
      to: '2022-04-28T15:22:00.000Z',
      owner: 'cases',
    });

    handler.setupFeature('mttr');
    await handler.compute();

    expect(caseService.executeAggregations.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "aggregationBuilders": Array [
          AverageDuration {},
        ],
        "options": Object {
          "filter": Object {
            "arguments": Array [
              Object {
                "arguments": Array [
                  Object {
                    "arguments": Array [
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "cases.attributes.created_at",
                      },
                      "gte",
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "2022-04-28T15:18:00.000Z",
                      },
                    ],
                    "function": "range",
                    "type": "function",
                  },
                  Object {
                    "arguments": Array [
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "cases.attributes.created_at",
                      },
                      "lte",
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "2022-04-28T15:22:00.000Z",
                      },
                    ],
                    "function": "range",
                    "type": "function",
                  },
                ],
                "function": "and",
                "type": "function",
              },
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases.attributes.owner",
                  },
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases",
                  },
                ],
                "function": "is",
                "type": "function",
              },
            ],
            "function": "and",
            "type": "function",
          },
        },
      }
    `);
  });
});
