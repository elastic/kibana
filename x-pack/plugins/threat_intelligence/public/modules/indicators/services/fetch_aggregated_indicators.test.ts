/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockedQueryService, mockedSearchService } from '../../../common/mocks/test_providers';
import { BehaviorSubject, throwError } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { AGGREGATION_NAME, createFetchAggregatedIndicators } from './fetch_aggregated_indicators';

const aggregationResponse = {
  rawResponse: { aggregations: { [AGGREGATION_NAME]: { buckets: [] } } },
};

describe('FetchAggregatedIndicatorsService', () => {
  beforeEach(jest.clearAllMocks);

  describe('aggregatedIndicatorsQuery()', () => {
    describe('when query is successful', () => {
      beforeEach(() => {
        mockedSearchService.search.mockReturnValue(new BehaviorSubject(aggregationResponse));
      });

      it('should pass the query down to searchService', async () => {
        const aggregatedIndicatorsQuery = createFetchAggregatedIndicators({
          searchService: mockedSearchService,
          queryService: mockedQueryService as any,
          inspectorAdapter: new RequestAdapter(),
        });

        const result = await aggregatedIndicatorsQuery({
          selectedPatterns: [],
          filterQuery: { language: 'kuery', query: '' },
          filters: [],
          field: 'myField',
          timeRange: {
            from: '',
            to: '',
          },
        });

        expect(mockedSearchService.search).toHaveBeenCalled();
        expect(mockedSearchService.search).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              body: expect.objectContaining({
                size: 0,
                query: expect.objectContaining({ bool: expect.anything() }),
                runtime_mappings: {
                  'threat.indicator.name': { script: expect.anything(), type: 'keyword' },
                  'threat.indicator.name_origin': { script: expect.anything(), type: 'keyword' },
                },
                aggregations: {
                  [AGGREGATION_NAME]: {
                    terms: {
                      field: 'myField',
                    },
                    aggs: {
                      events: {
                        date_histogram: {
                          field: '@timestamp',
                          fixed_interval: expect.anything(),
                          min_doc_count: 0,
                          extended_bounds: expect.anything(),
                        },
                      },
                    },
                  },
                },
                fields: ['@timestamp', 'myField'],
              }),
              index: [],
            }),
          }),
          expect.anything()
        );

        expect(result).toMatchInlineSnapshot(`Array []`);
      });
    });

    describe('when query fails', () => {
      beforeEach(() => {
        mockedSearchService.search.mockReturnValue(
          throwError(() => new Error('some random exception'))
        );
      });

      it('should throw an error', async () => {
        const aggregatedIndicatorsQuery = createFetchAggregatedIndicators({
          searchService: mockedSearchService,
          queryService: mockedQueryService as any,
          inspectorAdapter: new RequestAdapter(),
        });

        try {
          await aggregatedIndicatorsQuery({
            selectedPatterns: [],
            filterQuery: { language: 'kuery', query: '' },
            filters: [],
            field: 'myField',
            timeRange: {
              from: '',
              to: '',
            },
          });
        } catch (error) {
          expect(error).toMatchInlineSnapshot(`[Error: some random exception]`);
        }

        expect.assertions(1);
      });
    });
  });
});
