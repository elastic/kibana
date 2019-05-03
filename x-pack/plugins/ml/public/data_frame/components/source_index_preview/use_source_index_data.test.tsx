/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';

import { ml } from '../../../services/ml_api_service';
import { SimpleQuery } from '../../common';
import {
  SOURCE_INDEX_STATUS,
  useSourceIndexData,
  UseSourceIndexDataReturnType,
} from './use_source_index_data';

jest.mock('../../../services/ml_api_service');

type Callback = () => void;
interface TestHookProps {
  callback: Callback;
}

const TestHook: SFC<TestHookProps> = ({ callback }) => {
  callback();
  return null;
};

const testHook = (callback: Callback) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    ReactDOM.render(<TestHook callback={callback} />, container);
  });
};

const query: SimpleQuery = {
  query_string: {
    query: '*',
    default_operator: 'AND',
  },
};

let sourceIndexObj: UseSourceIndexDataReturnType;

describe('useSourceIndexData', () => {
  test('indexPattern set triggers loading', () => {
    testHook(() => {
      act(() => {
        sourceIndexObj = useSourceIndexData({ title: 'lorem', fields: [] }, query, [], () => {});
      });
    });

    expect(sourceIndexObj.errorMessage).toBe('');
    expect(sourceIndexObj.status).toBe(SOURCE_INDEX_STATUS.LOADING);
    expect(sourceIndexObj.tableItems).toEqual([]);
    expect(ml.esSearch).toHaveBeenCalledTimes(1);
  });

  // TODO add more tests to check data retrieved via `ml.esSearch()`.
  // This needs more investigation in regards to jest/enzyme's React Hooks support.
});
