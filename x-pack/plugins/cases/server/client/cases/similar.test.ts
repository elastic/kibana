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
    clientArgs.services.caseService.findCases.mockResolvedValue({
      page: 1,
      per_page: 10,
      total: mockCases.length,
      saved_objects: [],
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('search by uuid calls case service correctly', async () => {
      await similar(
        {
          case_id: mockCase.id,
          pageIndex: 1,
          pageSize: 10,
        },
        clientArgs
      );
      expect(clientArgs.services.caseService.findCases).toHaveBeenCalled();

      const call = clientArgs.services.caseService.findCases.mock.calls[0][0];

      expect(call).toMatchInlineSnapshot();
    });
  });
});
