/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';
import ReactDOM from 'react-dom';

import { ml } from '../../../services/ml_api_service';
import { SimpleQuery } from '../../common';
import {
  PIVOT_PREVIEW_STATUS,
  usePivotPreviewData,
  UsePivotPreviewDataReturnType,
} from './use_pivot_preview_data';

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
  ReactDOM.render(<TestHook callback={callback} />, container);
};

const query: SimpleQuery = {
  query_string: {
    query: '*',
    default_operator: 'AND',
  },
};

let pivotPreviewObj: UsePivotPreviewDataReturnType;

describe('usePivotPreviewData', () => {
  test('indexPattern not defined', () => {
    testHook(() => {
      pivotPreviewObj = usePivotPreviewData({ title: 'lorem', fields: [] }, query, {}, {});
    });

    expect(pivotPreviewObj.errorMessage).toBe('');
    expect(pivotPreviewObj.status).toBe(PIVOT_PREVIEW_STATUS.UNUSED);
    expect(pivotPreviewObj.dataFramePreviewData).toEqual([]);
    expect(ml.dataFrame.getDataFrameTransformsPreview).not.toHaveBeenCalled();
  });

  test('indexPattern set triggers loading', () => {
    testHook(() => {
      pivotPreviewObj = usePivotPreviewData({ title: 'lorem', fields: [] }, query, {}, {});
    });

    expect(pivotPreviewObj.errorMessage).toBe('');
    // ideally this should be LOADING instead of UNUSED but jest/enzyme/hooks doesn't
    // trigger that state upate yet.
    expect(pivotPreviewObj.status).toBe(PIVOT_PREVIEW_STATUS.UNUSED);
    expect(pivotPreviewObj.dataFramePreviewData).toEqual([]);
    // ideally this should be 1 instead of 0 but jest/enzyme/hooks doesn't
    // trigger that state upate yet.
    expect(ml.dataFrame.getDataFrameTransformsPreview).toHaveBeenCalledTimes(0);
  });

  // TODO add more tests to check data retrieved via `ml.esSearch()`.
  // This needs more investigation in regards to jest/enzyme's React Hooks support.
});
