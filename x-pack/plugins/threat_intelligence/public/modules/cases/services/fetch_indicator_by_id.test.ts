/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockedSearchService } from '../../../common/mocks/test_providers';
import { BehaviorSubject, throwError } from 'rxjs';
import { createFetchIndicatorById } from './fetch_indicator_by_id';
import { RequestAdapter } from '@kbn/inspector-plugin/common';

const indicatorsResponse = {
  rawResponse: { hits: { hits: [{ _id: 'testId' }], total: 0 } },
};

describe('FetchIndicatorByIdService', () => {
  beforeEach(jest.clearAllMocks);

  describe('fetchIndicatorById()', () => {
    describe('when query is successful', () => {
      beforeEach(() => {
        mockedSearchService.search.mockReturnValue(new BehaviorSubject(indicatorsResponse));
      });

      it('should pass the query down to searchService', async () => {
        const fetchIndicatorById = createFetchIndicatorById({
          searchService: mockedSearchService,
          inspectorAdapter: new RequestAdapter(),
        });

        const result = await fetchIndicatorById({
          indicatorId: 'testId',
        });

        expect(mockedSearchService.search).toHaveBeenCalled();
        expect(mockedSearchService.search).toHaveBeenCalledWith(
          expect.objectContaining({
            params: {
              body: {
                fields: [{ field: '*', include_unmapped: true }],
                query: expect.objectContaining({ bool: expect.anything() }),
                size: 1,
              },
            },
          }),
          expect.anything()
        );

        expect(result).toMatchInlineSnapshot(`
          Object {
            "_id": "testId",
          }
        `);
      });
    });

    describe('when query fails', () => {
      beforeEach(() => {
        mockedSearchService.search.mockReturnValue(
          throwError(() => new Error('some random exception'))
        );
      });

      it('should throw an error', async () => {
        const fetchIndicatorById = createFetchIndicatorById({
          searchService: mockedSearchService,
          inspectorAdapter: new RequestAdapter(),
        });

        try {
          await fetchIndicatorById({
            indicatorId: 'testId',
          });
        } catch (error) {
          expect(error).toMatchInlineSnapshot(`[Error: some random exception]`);
        }

        expect.assertions(1);
      });
    });
  });
});
