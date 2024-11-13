/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { similar } from './similar';
import { mockCase } from '../../../public/containers/mock';

describe('similar', () => {
  describe('find similar cases', () => {
    const clientArgs = createCasesClientMockArgs();

    jest.mocked(clientArgs.services.caseService.getCase).mockResolvedValue({
      ...mockCases[0],
      attributes: {
        ...mockCases[0].attributes,
        observables: [
          {
            id: 'ddfb207d-4b46-4545-bae8-5193c1551e50',
            value: 'test',
            typeKey: 'e47bb0d9-665a-43ea-a9aa-4d07c728e666',
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
        clientArgs
      );
      expect(clientArgs.services.caseService.findCases).toHaveBeenCalled();

      const call = clientArgs.services.caseService.findCases.mock.calls[0][0];

      expect(call).toMatchInlineSnapshot(`
        Object {
          "filter": Object {
            "arguments": Array [],
            "function": "or",
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
