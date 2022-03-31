/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks/dom';
import { useUrlQuery } from './use_url_query';
import { useLocation, useHistory } from 'react-router-dom';
import { encodeQuery } from '../navigation/query_utils';

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn(),
  useLocation: jest.fn(),
}));

describe('useUrlQuery', () => {
  it('uses default query when no query is provided', () => {
    const defaultQuery = { foo: 1 };
    (useHistory as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });
    (useLocation as jest.Mock).mockReturnValue({
      search: encodeQuery(defaultQuery),
    });

    const { result } = renderHook(() => useUrlQuery(() => defaultQuery));

    act(() => {
      result.current.setUrlQuery({});
    });

    expect(result.current.urlQuery.foo).toBe(defaultQuery.foo);
    expect(useHistory().push).toHaveBeenCalledTimes(1);
  });

  it('merges default query, partial first query and partial second query', () => {
    const defaultQuery = { foo: 1, zoo: 2, moo: 3 };
    const first = { zoo: 3 };
    const second = { moo: 4 };
    (useHistory as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });
    (useLocation as jest.Mock).mockReturnValue({
      search: encodeQuery({ ...defaultQuery, ...first, ...second }),
    });

    const { result } = renderHook(() => useUrlQuery(() => defaultQuery));

    act(() => {
      result.current.setUrlQuery(first);
    });
    act(() => {
      result.current.setUrlQuery(second);
    });

    expect(result.current.urlQuery.foo).toBe(defaultQuery.foo);
    expect(result.current.urlQuery.zoo).toBe(first.zoo);
    expect(result.current.urlQuery.moo).toBe(second.moo);
    expect(useHistory().push).toHaveBeenCalledTimes(2);
  });
});
