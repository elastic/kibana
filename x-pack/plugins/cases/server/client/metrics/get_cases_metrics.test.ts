/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseMetricsFeature } from '../../../common/types/api';
import type { CasesClientMock } from '../mocks';
import { getCasesMetrics } from './get_cases_metrics';
import { createMockClientArgs, createMockClient } from './test_utils/client';

describe('getCasesMetrics', () => {
  let client: CasesClientMock;
  let mockServices: ReturnType<typeof createMockClientArgs>['mockServices'];
  let clientArgs: ReturnType<typeof createMockClientArgs>['clientArgs'];

  beforeEach(() => {
    client = createMockClient();
    ({ mockServices, clientArgs } = createMockClientArgs());

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('MTTR', () => {
    beforeEach(() => {
      mockServices.services.caseService.executeAggregations.mockResolvedValue({
        mttr: { value: 5 },
      });
    });

    it('throws with excess fields', async () => {
      await expect(
        // @ts-expect-error: excess attribute
        getCasesMetrics({ features: [CaseMetricsFeature.MTTR], foo: 'bar' }, client, clientArgs)
      ).rejects.toThrow('invalid keys "foo"');
    });

    it('returns the mttr metric', async () => {
      const metrics = await getCasesMetrics(
        { features: [CaseMetricsFeature.MTTR] },
        client,
        clientArgs
      );
      expect(metrics).toEqual({ mttr: 5 });
    });

    it('calls the executeAggregations correctly', async () => {
      await getCasesMetrics(
        {
          features: [CaseMetricsFeature.MTTR],
          from: '2022-04-28T15:18:00.000Z',
          to: '2022-04-28T15:22:00.000Z',
          owner: 'cases',
        },
        client,
        clientArgs
      );
      expect(mockServices.services.caseService.executeAggregations.mock.calls[0][0])
        .toMatchInlineSnapshot(`
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

  describe('validation', () => {
    beforeEach(() => {
      mockServices.services.caseService.executeAggregations.mockResolvedValue({
        mttr: { value: 5 },
      });
    });

    it('throws with unknown feature value', async () => {
      // @ts-expect-error: invalid feature value
      await expect(getCasesMetrics({ features: ['foobar'] }, client, clientArgs)).rejects.toThrow(
        'Invalid value "foobar" supplied to "features"'
      );
    });
  });
});
