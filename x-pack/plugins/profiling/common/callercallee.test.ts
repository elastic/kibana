/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';
import { createCallerCalleeGraph } from './callercallee';
import { createStackFrameMetadata, groupStackFrameMetadataByStackTrace } from './profiling';

import { events, stackTraces, stackFrames, executables } from './__fixtures__/stacktraces';

describe('Caller-callee operations', () => {
  test('1', () => {
    const totalSamples = sum([...events.values()]);

    const rootFrame = createStackFrameMetadata();
    const frameMetadataForTraces = groupStackFrameMetadataByStackTrace(
      stackTraces,
      stackFrames,
      executables
    );
    const root = createCallerCalleeGraph(rootFrame, events, frameMetadataForTraces);

    expect(root.Samples).toEqual(totalSamples);
    expect(root.CountInclusive).toEqual(totalSamples);
    expect(root.CountExclusive).toEqual(0);
  });
});
