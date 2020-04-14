/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';
import '@testing-library/jest-dom/extend-expect';

import { SimpleQuery } from '../../common';
import { SearchItems } from '../../hooks/use_search_items';
import { useIndexData } from './use_index_data';
import { INDEX_STATUS, UseIndexDataReturnType } from './types';

jest.mock('../../../shared_imports');
jest.mock('../../hooks/use_api');

const query: SimpleQuery = {
  query_string: {
    query: '*',
    default_operator: 'AND',
  },
};

describe('useSourceIndexData', () => {
  test('indexPattern set triggers loading', async done => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useIndexData(
        ({
          id: 'the-id',
          title: 'the-title',
          fields: [],
        } as unknown) as SearchItems['indexPattern'],
        query
      )
    );
    const IndexObj: UseIndexDataReturnType = result.current;

    await waitForNextUpdate();

    expect(IndexObj.errorMessage).toBe('');
    expect(IndexObj.status).toBe(INDEX_STATUS.LOADING);
    expect(IndexObj.tableItems).toEqual([]);
    done();
  });

  // TODO add more tests to check data retrieved via `api.esSearch()`.
  // This needs more investigation in regards to jest's React Hooks support.
});
