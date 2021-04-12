/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRANSFORM_STATE } from '../../../../../../common/constants';

import mockTransformListRow from '../../../../common/__mocks__/transform_list_row.json';

import { TransformListRow, isCompletedBatchTransform } from '../../../../common';

describe('Transform: isCompletedBatchTransform()', () => {
  test('isCompletedBatchTransform()', () => {
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
