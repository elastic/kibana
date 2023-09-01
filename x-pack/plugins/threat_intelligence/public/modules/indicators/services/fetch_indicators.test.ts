/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockedSearchService } from '../../../mocks/test_providers';
import { BehaviorSubject, throwError } from 'rxjs';
import { createFetchIndicators } from './fetch_indicators';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { FactoryQueryType } from '../../../../common/constants';

const indicatorsResponse = { rawResponse: { hits: { hits: [], total: 0 } } };

describe('FetchIndicatorsService', () => {
  beforeEach(jest.clearAllMocks);

  describe('indicatorsQuery()', () => {
    describe('when query is successful', () => {
      beforeEach(() => {
        mockedSearchService.search.mockReturnValue(new BehaviorSubject(indicatorsResponse));
      });

      it('should pass the query down to searchService', async () => {
        const indicatorsQuery = createFetchIndicators({
          searchService: mockedSearchService,
          inspectorAdapter: new RequestAdapter(),
        });

        const result = await indicatorsQuery({
          pagination: {
            pageIndex: 0,
            pageSize: 25,
            pageSizeOptions: [1, 2, 3],
          },
          selectedPatterns: [],
          sorting: [],
          filterQuery: { language: 'kuery', query: '' },
          filters: [],
        });

        expect(mockedSearchService.search).toHaveBeenCalled();
        expect(mockedSearchService.search).toHaveBeenCalledWith(
          expect.objectContaining({
            params: {
              body: {
                fields: [{ field: '*', include_unmapped: true }],
                from: 0,
                query: expect.objectContaining({ bool: expect.anything() }),
                size: 25,
                sort: [],
              },
              index: [],
            },
            factoryQueryType: FactoryQueryType.IndicatorGrid,
          }),
          expect.anything()
        );

        expect(result).toMatchInlineSnapshot(`
          Object {
            "indicators": Array [],
            "total": 0,
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
        const indicatorsQuery = createFetchIndicators({
          searchService: mockedSearchService,
          inspectorAdapter: new RequestAdapter(),
        });

        try {
          await indicatorsQuery({
            pagination: {
              pageIndex: 0,
              pageSize: 25,
              pageSizeOptions: [1, 2, 3],
            },
            selectedPatterns: [],
            sorting: [],
            filterQuery: { language: 'kuery', query: '' },
            filters: [],
          });
        } catch (error) {
          expect(error).toMatchInlineSnapshot(`[Error: some random exception]`);
        }

        expect.assertions(1);
      });
    });
  });
});
