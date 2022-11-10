/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';
import { createCalleeTree } from './callee';

import { events, stackTraces, stackFrames, executables } from './__fixtures__/stacktraces';

const totalSamples = sum([...events.values()]);
const totalFrames = sum([...stackTraces.values()].map((trace) => trace.FrameIDs.length));
const tree = createCalleeTree(events, stackTraces, stackFrames, executables, totalFrames);

describe('Callee operations', () => {
  test('inclusive count of root equals total sampled stacktraces', () => {
    expect(tree.CountInclusive[0]).toEqual(totalSamples);
  });

  test('inclusive count for each node should be greater than or equal to its children', () => {
    const allGreaterThanOrEqual = tree.Edges.map(
      (children, i) =>
        tree.CountInclusive[i] >= sum([...children.values()].map((j) => tree.CountInclusive[j]))
    );
    expect(allGreaterThanOrEqual).toBeTruthy();
  });

  test('exclusive count of root is zero', () => {
    expect(tree.CountExclusive[0]).toEqual(0);
  });

  test('tree de-duplicates sibling nodes', () => {
    expect(tree.Size).toEqual(totalFrames - 2);
  });
});
