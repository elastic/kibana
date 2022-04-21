/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRANSFORM_STATE } from '../../../common/constants';

import mockTransformListRow from './__mocks__/transform_list_row.json';
import mockTransformStats from './__mocks__/transform_stats.json';

import { TransformListRow } from './transform_list';
import { getTransformProgress, isCompletedBatchTransform } from './transform_stats';

const getRow = (statsId: string) => {
  return {
    // @ts-expect-error mock data does not actually match TransformListRow type
    ...(mockTransformListRow as TransformListRow),
    stats: {
      ...(mockTransformStats.transforms as Array<TransformListRow['stats']>).find(
        (stats) => stats.id === statsId
      )!,
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

  test('isCompletedBatchTransform() — Mock #1', () => {
    expect(isCompletedBatchTransform(getRow('transform-created'))).toBe(false);
    expect(isCompletedBatchTransform(getRow('transform-created-started-stopped'))).toBe(false);
    expect(isCompletedBatchTransform(getRow('transform-running'))).toBe(false);
    expect(isCompletedBatchTransform(getRow('transform-completed'))).toBe(true);
  });

  test('isCompletedBatchTransform() — Mock #2', () => {
    // check the transform config/state against the conditions
    // that will be used by isCompletedBatchTransform()
    // followed by a call to isCompletedBatchTransform() itself
    // @ts-expect-error mock data is too loosely typed
    const row = mockTransformListRow as TransformListRow;
    expect(row.stats.checkpointing.last.checkpoint === 1).toBe(true);
    expect(row.config.sync === undefined).toBe(true);
    expect(row.stats.state === TRANSFORM_STATE.STOPPED).toBe(true);
    expect(isCompletedBatchTransform(row)).toBe(true);

    // adapt the mock config to resemble a non-completed transform.
    row.stats.checkpointing.last.checkpoint = 0;
    expect(isCompletedBatchTransform(row)).toBe(false);
  });
});
