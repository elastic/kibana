/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useInspectQuery } from './use_inspect_query';

import { useGlobalTime } from '../containers/use_global_time';

jest.mock('../containers/use_global_time');

const QUERY_ID = 'tes_query_id';

const RESPONSE = {
  inspect: { dsl: [], response: [] },
  isPartial: false,
  isRunning: false,
  total: 0,
  loaded: 0,
  rawResponse: {
    took: 0,
    timed_out: false,
    _shards: {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
    },
    results: {
      hits: {
        total: 0,
      },
    },
    hits: {
      total: 0,
      max_score: 0,
      hits: [],
    },
  },
  totalCount: 0,
  enrichments: [],
};

describe('useInspectQuery', () => {
  let deleteQuery: jest.Mock;
  let setQuery: jest.Mock;

  beforeEach(() => {
    deleteQuery = jest.fn();
    setQuery = jest.fn();
    (useGlobalTime as jest.Mock).mockImplementation(() => ({
      deleteQuery,
      setQuery,
      isInitializing: false,
    }));
  });

  it('it calls setQuery', () => {
    renderHook(() => useInspectQuery(QUERY_ID, false, RESPONSE));

    expect(setQuery).toHaveBeenCalledTimes(1);
    expect(setQuery.mock.calls[0][0].id).toBe(QUERY_ID);
  });

  it("doesn't call setQuery when response is undefined", () => {
    renderHook(() => useInspectQuery(QUERY_ID, false, undefined));

    expect(setQuery).not.toHaveBeenCalled();
  });

  it("doesn't call setQuery when loading", () => {
    renderHook(() => useInspectQuery(QUERY_ID, true));

    expect(setQuery).not.toHaveBeenCalled();
  });

  it('calls deleteQuery when unmouting', () => {
    const result = renderHook(() => useInspectQuery(QUERY_ID, false, RESPONSE));
    result.unmount();

    expect(deleteQuery).toHaveBeenCalledWith({ id: QUERY_ID });
  });
});
