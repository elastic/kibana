/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';

import { createCalleeTree } from './callee';
import { decodeStackTraceResponse } from './stack_traces';

import { stackTraceFixtures } from './__fixtures__/stacktraces';

describe('Callee operations', () => {
  stackTraceFixtures.forEach(({ response, seconds, upsampledBy }) => {
    const { events, stackTraces, stackFrames, executables, totalFrames, samplingRate } =
      decodeStackTraceResponse(response);
    const tree = createCalleeTree(
      events,
      stackTraces,
      stackFrames,
      executables,
      totalFrames,
      samplingRate
    );

    describe(`stacktraces from ${seconds} seconds and upsampled by ${upsampledBy}`, () => {
      test('inclusive count of root to be less than or equal total sampled stacktraces', () => {
        const totalAdjustedSamples = Math.ceil(sum([...events.values()]) / samplingRate);
        expect(tree.CountInclusive[0]).toBeLessThanOrEqual(totalAdjustedSamples);
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
        expect(tree.Size).toBeLessThan(totalFrames);
      });
    });
  });
});
