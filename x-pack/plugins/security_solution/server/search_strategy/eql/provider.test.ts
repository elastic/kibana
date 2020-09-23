/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, RequestHandlerContext } from 'src/core/server';
import { getValidEqlResponse } from '../../../common/search_strategy/eql/validation/helpers.mock';
import { eqlSearchStrategyProvider } from './provider';

describe('EQL search strategy', () => {
  const mockEqlSearch = jest.fn();
  const mockLogger = ({
    debug: () => {},
  } as unknown) as Logger;
  const mockContext = ({
    core: {
      elasticsearch: {
        client: {
          asCurrentUser: {
            eql: {
              search: mockEqlSearch,
            },
          },
        },
      },
    },
  } as unknown) as RequestHandlerContext;

  beforeEach(() => {
    mockEqlSearch.mockClear();
  });

  it('returns a strategy with `search`', async () => {
    const eqlSearch = await eqlSearchStrategyProvider(mockLogger);

    expect(typeof eqlSearch.search).toBe('function');
  });

  it('makes a POST request to eql client search with params when no ID is provided', async () => {
    mockEqlSearch.mockResolvedValueOnce({ body: getValidEqlResponse() });

    const params = { index: 'logstash-*', body: { query: {} } };
    const options = { ignore: [400] };
    const eqlSearch = await eqlSearchStrategyProvider(mockLogger);

    await eqlSearch.search(mockContext, { options, params });

    expect(mockEqlSearch).toBeCalled();
    const [[request, requestOptions]] = mockEqlSearch.mock.calls;

    expect(request.index).toEqual(params.index);
    expect(request.body).toEqual(params.body);
    expect(requestOptions).toEqual(options);
  });
});
