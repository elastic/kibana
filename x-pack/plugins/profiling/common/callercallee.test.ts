/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';
import { createCallerCalleeGraph } from './callercallee';
import { createLazyStackTraceMap, createStackFrameMetadata } from './profiling';

import { events, stackTraces, stackFrames, executables } from './__fixtures__/stacktraces';

describe('Caller-callee operations', () => {
  test('1', () => {
    const totalSamples = sum([...events.values()]);

    const rootFrame = createStackFrameMetadata();
    const lazyStackTraceMap = createLazyStackTraceMap(stackTraces, stackFrames, executables);
    const graph = createCallerCalleeGraph(
      rootFrame,
      events,
      stackTraces,
      stackFrames,
      executables,
      lazyStackTraceMap
    );

    expect(graph.root.Samples).toEqual(totalSamples);
    expect(graph.root.CountInclusive).toEqual(totalSamples);
    expect(graph.root.CountExclusive).toEqual(0);
  });
});
