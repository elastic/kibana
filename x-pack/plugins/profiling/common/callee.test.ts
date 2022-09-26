/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';
import { createCalleeTree } from './callee';

import { events, stackTraces, stackFrames, executables } from './__fixtures__/stacktraces';

describe('Callee operations', () => {
  test('1', () => {
    const totalSamples = sum([...events.values()]);
    const totalFrames = sum([...stackTraces.values()].map((trace) => trace.FrameIDs.length));

    const tree = createCalleeTree(events, stackTraces, stackFrames, executables, totalFrames);

    expect(tree.Samples[0]).toEqual(totalSamples);
    expect(tree.CountInclusive[0]).toEqual(totalSamples);
    expect(tree.CountExclusive[0]).toEqual(0);
  });
});
