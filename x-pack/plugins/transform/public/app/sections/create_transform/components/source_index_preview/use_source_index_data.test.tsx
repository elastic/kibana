/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';
import '@testing-library/jest-dom/extend-expect';

import { SimpleQuery } from '../../../../common';
import {
  SOURCE_INDEX_STATUS,
  useSourceIndexData,
  UseSourceIndexDataReturnType,
} from './use_source_index_data';

jest.mock('../../../../hooks/use_api');

const query: SimpleQuery = {
  query_string: {
    query: '*',
    default_operator: 'AND',
  },
};

describe('useSourceIndexData', () => {
  test('indexPattern set triggers loading', async (done) => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useSourceIndexData({ id: 'the-id', title: 'the-title', fields: [] }, query)
    );
    const sourceIndexObj: UseSourceIndexDataReturnType = result.current;

    await waitForNextUpdate();

    expect(sourceIndexObj.errorMessage).toBe('');
    expect(sourceIndexObj.status).toBe(SOURCE_INDEX_STATUS.LOADING);
    expect(sourceIndexObj.tableItems).toEqual([]);
    done();
  });

  // TODO add more tests to check data retrieved via `api.esSearch()`.
  // This needs more investigation in regards to jest's React Hooks support.
});
