/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCases } from '../../mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { similar } from './similar';
import { mockCase } from '../../../public/containers/mock';
import { OBSERVABLE_TYPE_IPV4 } from '../../../common/constants';

describe('similar', () => {
  describe('find similar cases', () => {
    const clientArgs = createCasesClientMockArgs();
    const casesClient = createCasesClientMock();

    jest.mocked(clientArgs.services.caseService.getCase).mockResolvedValue({
      ...mockCases[0],
      attributes: {
        ...mockCases[0].attributes,
        observables: [
          {
            id: 'ddfb207d-4b46-4545-bae8-5193c1551e50',
            value: '127.0.0.1',
            typeKey: OBSERVABLE_TYPE_IPV4.key,
            createdAt: '2024-11-07',
            updatedAt: '2024-11-07',
            description: '',
          },
        ],
      },
    });

    clientArgs.services.caseService.findCases.mockResolvedValue({
      page: 1,
      per_page: 10,
      total: mockCases.length,
      saved_objects: [],
    });

    clientArgs.services.caseConfigureService.find.mockResolvedValue({
      saved_objects: [],
      page: 1,
      per_page: 10,
      total: mockCases.length,
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('search by uuid calls case service correctly', async () => {
      await similar(
        mockCase.id,
        {
          page: 1,
          perPage: 10,
        },
        clientArgs,
        casesClient
      );
      expect(clientArgs.services.caseService.findCases).toHaveBeenCalled();

      const call = clientArgs.services.caseService.findCases.mock.calls[0][0];

      expect(call).toMatchInlineSnapshot(`
        Object {
          "filter": Object {
            "arguments": Array [
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "cases.attributes.observables",
                  },
                  Object {
                    "arguments": Array [
                      Object {
                        "arguments": Array [
                          Object {
                            "isQuoted": false,
                            "type": "literal",
                            "value": "value",
                          },
                          Object {
                            "isQuoted": true,
                            "type": "literal",
                            "value": "127.0.0.1",
                          },
                        ],
                        "function": "is",
                        "type": "function",
                      },
                      Object {
                        "arguments": Array [
                          Object {
                            "isQuoted": false,
                            "type": "literal",
                            "value": "typeKey",
                          },
                          Object {
                            "isQuoted": true,
                            "type": "literal",
                            "value": "observable-type-ipv4",
                          },
                        ],
                        "function": "is",
                        "type": "function",
                      },
                    ],
                    "function": "and",
                    "type": "function",
                  },
                ],
                "function": "nested",
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
                    "value": "securitySolution",
                  },
                ],
                "function": "is",
                "type": "function",
              },
            ],
            "function": "and",
            "type": "function",
          },
          "page": 1,
          "perPage": 10,
          "rootSearchFields": Array [
            "_id",
          ],
          "search": "-\\"cases:mock-id\\"",
          "sortField": "created_at",
        }
      `);
    });
  });
});
