/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';
import { createCalleeTree } from './callee';
import { createColumnarViewModel, createFlameGraph } from './flamegraph';

import { events, stackTraces, stackFrames, executables } from './__fixtures__/stacktraces';

describe('Flamegraph operations', () => {
  test('1', () => {
    const totalSamples = sum([...events.values()]);
    const totalFrames = sum([...stackTraces.values()].map((trace) => trace.FrameIDs.length));

    const tree = createCalleeTree(events, stackTraces, stackFrames, executables, totalFrames);
    const graph = createFlameGraph(tree, 60, totalSamples, totalSamples);

    expect(graph.Size).toEqual(totalFrames - 2);

    const viewModel1 = createColumnarViewModel(graph);

    expect(sum(viewModel1.color)).toBeGreaterThan(0);

    const viewModel2 = createColumnarViewModel(graph, false);

    expect(sum(viewModel2.color)).toEqual(0);
  });
});
