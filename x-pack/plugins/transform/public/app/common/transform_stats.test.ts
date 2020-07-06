/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockTransformListRow from './__mocks__/transform_list_row.json';
import mockTransformStats from './__mocks__/transform_stats.json';

import { TransformListRow } from './transform_list';
import { getTransformProgress, isCompletedBatchTransform } from './transform_stats';

const getRow = (statsId: string) => {
  return {
    ...(mockTransformListRow as TransformListRow),
    stats: {
      ...mockTransformStats.transforms.find(
        (stats: TransformListRow['stats']) => stats.id === statsId
      ),
    },
  };
};

describe('Transform: Transform stats.', () => {
  test('getTransformProgress()', () => {
    // At the moment, any kind of stopped jobs don't include progress information.
    // We cannot infer progress for now from an unfinished job that has been stopped for now.
    expect(getTransformProgress(getRow('transform-created'))).toBe(undefined);
    expect(getTransformProgress(getRow('transform-created-started-stopped'))).toBe(undefined);
    expect(getTransformProgress(getRow('transform-running'))).toBe(21);
    expect(getTransformProgress(getRow('transform-completed'))).toBe(100);
  });

  test('isCompletedBatchTransform()', () => {
    expect(isCompletedBatchTransform(getRow('transform-created'))).toBe(false);
    expect(isCompletedBatchTransform(getRow('transform-created-started-stopped'))).toBe(false);
    expect(isCompletedBatchTransform(getRow('transform-running'))).toBe(false);
    expect(isCompletedBatchTransform(getRow('transform-completed'))).toBe(true);
  });
});
