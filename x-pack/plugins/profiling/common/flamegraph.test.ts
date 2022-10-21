/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';
import { createCalleeTree } from './callee';
import { createBaseFlameGraph, createFlameGraph } from './flamegraph';

import { events, stackTraces, stackFrames, executables } from './__fixtures__/stacktraces';

const totalFrames = sum([...stackTraces.values()].map((trace) => trace.FrameIDs.length));
const tree = createCalleeTree(events, stackTraces, stackFrames, executables, totalFrames);
const baseFlamegraph = createBaseFlameGraph(tree, 60);
const flamegraph = createFlameGraph(baseFlamegraph);

describe('Flamegraph operations', () => {
  test('base flamegraph has non-zero total seconds', () => {
    expect(baseFlamegraph.TotalSeconds).toEqual(60);
  });

  test('base flamegraph has one more node than the number of edges', () => {
    const numEdges = baseFlamegraph.Edges.flatMap((edge) => edge).length;

    expect(numEdges).toEqual(baseFlamegraph.Size - 1);
  });

  test('all flamegraph IDs are the same non-zero length', () => {
    // 16 is the length of a 64-bit FNV-1a hash encoded to a hex string
    const allSameLengthIDs = flamegraph.ID.every((id) => id.length === 16);

    expect(allSameLengthIDs).toBeTruthy();
  });

  test('all flamegraph labels are non-empty', () => {
    const allNonEmptyLabels = flamegraph.Label.every((id) => id.length > 0);

    expect(allNonEmptyLabels).toBeTruthy();
  });
});
