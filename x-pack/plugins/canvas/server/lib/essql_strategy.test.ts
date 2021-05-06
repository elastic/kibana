/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { essqlSearchStrategyProvider } from './essql_strategy';
import { EssqlSearchStrategyRequest } from '../../types';
import { zipObject } from 'lodash';

const getMockEssqlResponse = () => ({
  body: {
    columns: [
      { name: 'One', type: 'keyword' },
      { name: 'Two', type: 'keyword' },
    ],
    rows: [
      ['foo', 'bar'],
      ['buz', 'baz'],
      ['beep', 'boop'],
    ],
    cursor: 'cursor-value',
  },
  statusCode: 200,
});

const basicReq: EssqlSearchStrategyRequest = {
  query: 'SELECT * FROM my_index;',
  count: 3,
  params: ['my_var'],
  filter: [
    {
      type: 'filter',
      filterType: 'exactly',
      value: 'Test Value',
      column: 'One',
      and: [],
    },
  ],
  timezone: 'UTC',
};

describe('ESSQL search strategy', () => {
  // beforeEach(() => {});

  describe('strategy interface', () => {
    it('returns a strategy with a `search` function', async () => {
      const essqlSearch = await essqlSearchStrategyProvider();
      expect(typeof essqlSearch.search).toBe('function');
    });
  });

  describe('search()', () => {
    let mockQuery: jest.Mock;
    let mockClearCursor: jest.Mock;
    let mockDeps: any;

    beforeEach(() => {
      mockQuery = jest.fn().mockResolvedValueOnce(getMockEssqlResponse());
      mockClearCursor = jest.fn();
      mockDeps = ({
        esClient: {
          asCurrentUser: {
            sql: {
              query: mockQuery,
              clearCursor: mockClearCursor,
            },
          },
        },
      } as unknown) as any;
    });

    describe('query functionality', () => {
      it('performs a simple query', async () => {
        const sqlSearch = await essqlSearchStrategyProvider();
        const result = await sqlSearch.search(basicReq, {}, mockDeps).toPromise();
        const [[request]] = mockQuery.mock.calls;

        expect(request.format).toEqual('json');
        expect(request.body).toEqual(
          expect.objectContaining({
            query: basicReq.query,
            client_id: 'canvas',
            fetch_size: basicReq.count,
            time_zone: basicReq.timezone,
            field_multi_value_leniency: true,
            params: ['my_var'],
          })
        );

        const expectedColumns = getMockEssqlResponse().body.columns.map((c) => ({
          id: c.name,
          name: c.name,
          meta: { type: 'string' },
        }));
        const columnNames = expectedColumns.map((c) => c.name);
        const expectedRows = getMockEssqlResponse().body.rows.map((r) => zipObject(columnNames, r));

        expect(result.columns).toEqual(expectedColumns);
        expect(result.rows).toEqual(expectedRows);
      });

      it('iterates over cursor to retrieve for records query', async () => {
        const pageOne = {
          body: {
            columns: [
              { name: 'One', type: 'keyword' },
              { name: 'Two', type: 'keyword' },
            ],
            rows: [['foo', 'bar']],
            cursor: 'cursor-value',
          },
        };

        const pageTwo = {
          body: {
            rows: [['buz', 'baz']],
          },
        };

        mockQuery.mockReset().mockReturnValueOnce(pageOne).mockReturnValueOnce(pageTwo);

        const sqlSearch = await essqlSearchStrategyProvider();
        const result = await sqlSearch.search({ ...basicReq, count: 2 }, {}, mockDeps).toPromise();

        expect(result.rows).toHaveLength(2);
      });

      it('closes any cursors that remain open', async () => {
        const sqlSearch = await essqlSearchStrategyProvider();
        await sqlSearch.search(basicReq, {}, mockDeps).toPromise();

        const [[cursorReq]] = mockClearCursor.mock.calls;
        expect(cursorReq.body.cursor).toEqual('cursor-value');
      });

      it('emits an error if the client throws', async () => {
        const req: EssqlSearchStrategyRequest = {
          query: 'SELECT * FROM my_index;',
          count: 1,
          params: [],
          filter: [
            {
              type: 'filter',
              filterType: 'exactly',
              value: 'Test Value',
              column: 'category.keyword',
              and: [],
            },
          ],
          timezone: 'UTC',
        };

        expect.assertions(1);
        mockQuery.mockReset().mockRejectedValueOnce(new Error('client error'));
        const eqlSearch = await essqlSearchStrategyProvider();
        eqlSearch.search(req, {}, mockDeps).subscribe(
          () => {},
          (err) => {
            expect(err).toEqual(new Error('client error'));
          }
        );
      });
    });

    // describe('arguments', () => {
    //   it('sends along async search options', async () => {
    //     const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
    //     await eqlSearch.search({ options, params }, {}, mockDeps).toPromise();
    //     const [[request]] = mockEqlSearch.mock.calls;

    //     expect(request).toEqual(
    //       expect.objectContaining({
    //         wait_for_completion_timeout: '100ms',
    //       })
    //     );
    //   });

    //   it('sends along default search parameters', async () => {
    //     const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
    //     await eqlSearch.search({ options, params }, {}, mockDeps).toPromise();
    //     const [[request]] = mockEqlSearch.mock.calls;

    //     expect(request).toEqual(
    //       expect.objectContaining({
    //         ignore_unavailable: true,
    //         ignore_throttled: true,
    //       })
    //     );
    //   });

    //   it('allows search parameters to be overridden', async () => {
    //     const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
    //     await eqlSearch
    //       .search(
    //         {
    //           options,
    //           params: {
    //             ...params,
    //             wait_for_completion_timeout: '5ms',
    //             keep_on_completion: false,
    //           },
    //         },
    //         {},
    //         mockDeps
    //       )
    //       .toPromise();
    //     const [[request]] = mockEqlSearch.mock.calls;

    //     expect(request).toEqual(
    //       expect.objectContaining({
    //         wait_for_completion_timeout: '5ms',
    //         keep_on_completion: false,
    //       })
    //     );
    //   });

    //   it('allows search options to be overridden', async () => {
    //     const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
    //     await eqlSearch
    //       .search(
    //         {
    //           options: { ...options, maxRetries: 2, ignore: [300] },
    //           params,
    //         },
    //         {},
    //         mockDeps
    //       )
    //       .toPromise();
    //     const [[, requestOptions]] = mockEqlSearch.mock.calls;

    //     expect(requestOptions).toEqual(
    //       expect.objectContaining({
    //         maxRetries: 2,
    //         ignore: [300],
    //       })
    //     );
    //   });

    //   it('passes transport options for an existing request', async () => {
    //     const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
    //     await eqlSearch
    //       .search({ id: 'my-search-id', options: { ignore: [400] } }, {}, mockDeps)
    //       .toPromise();
    //     const [[, requestOptions]] = mockEqlGet.mock.calls;

    //     expect(mockEqlSearch).not.toHaveBeenCalled();
    //     expect(requestOptions).toEqual(expect.objectContaining({ ignore: [400] }));
    //   });
    // });

    // describe('response', () => {
    //   it('contains a rawResponse field containing the full search response', async () => {
    //     const eqlSearch = await eqlSearchStrategyProvider(mockLogger);
    //     const response = await eqlSearch
    //       .search({ id: 'my-search-id', options: { ignore: [400] } }, {}, mockDeps)
    //       .toPromise();

    //     expect(response).toEqual(
    //       expect.objectContaining({
    //         rawResponse: expect.objectContaining(getMockEqlResponse()),
    //       })
    //     );
    //   });
    // });
  });
});
