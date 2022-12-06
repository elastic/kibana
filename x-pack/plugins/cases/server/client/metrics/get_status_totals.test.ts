/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStatusTotalsByType } from './get_status_totals';
import { createMockClientArgs } from './test_utils/client';

describe('getStatusTotalsByType', () => {
  let mockServices: ReturnType<typeof createMockClientArgs>['mockServices'];
  let clientArgs: ReturnType<typeof createMockClientArgs>['clientArgs'];

  beforeEach(() => {
    ({ mockServices, clientArgs } = createMockClientArgs());

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('MTTR', () => {
    beforeEach(() => {
      mockServices.services.caseService.getCaseStatusStats.mockResolvedValue({
        open: 1,
        'in-progress': 2,
        closed: 1,
      });
    });

    it('returns the status correctly', async () => {
      const metrics = await getStatusTotalsByType({}, clientArgs);
      expect(metrics).toEqual({
        count_closed_cases: 1,
        count_in_progress_cases: 2,
        count_open_cases: 1,
      });
    });

    it('calls the executeAggregations correctly', async () => {
      await getStatusTotalsByType(
        {
          from: '2022-04-28T15:18:00.000Z',
          to: '2022-04-28T15:22:00.000Z',
          owner: 'cases',
        },
        clientArgs
      );

      expect(mockServices.services.caseService.getCaseStatusStats.mock.calls[0][0])
        .toMatchInlineSnapshot(`
        Object {
          "searchOptions": Object {
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
            "sortField": "created_at",
          },
        }
      `);
    });
  });
});
