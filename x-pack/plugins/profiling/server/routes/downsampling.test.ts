/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DownsampledEventsIndex, getSampledTraceEventsIndex } from './downsampling';

describe('Using down-sampled indexes', () => {
  test('getSampledTraceEventsIndex', () => {
    const targetSampleSize = 20000;
    const initialExp = 6;
    const tests: Array<{
      sampleCountFromPow6: number;
      expected: DownsampledEventsIndex;
    }> = [
      {
        // stay with the input downsampled index
        sampleCountFromPow6: targetSampleSize,
        expected: { name: 'profiling-events-5pow06', sampleRate: 1 / 5 ** 6 },
      },
      {
        // stay with the input downsampled index
        sampleCountFromPow6: targetSampleSize * 5 - 1,
        expected: { name: 'profiling-events-5pow06', sampleRate: 1 / 5 ** 6 },
      },
      {
        // go down one downsampling step
        sampleCountFromPow6: targetSampleSize * 5,
        expected: { name: 'profiling-events-5pow07', sampleRate: 1 / 5 ** 7 },
      },
      {
        // go up one downsampling step
        sampleCountFromPow6: targetSampleSize - 1,
        expected: { name: 'profiling-events-5pow05', sampleRate: 1 / 5 ** 5 },
      },
      {
        // go to the full events index
        sampleCountFromPow6: 0,
        expected: { name: 'profiling-events-all', sampleRate: 1 },
      },
      {
        // go to the most downsampled index
        sampleCountFromPow6: targetSampleSize * 5 ** 8,
        expected: { name: 'profiling-events-5pow11', sampleRate: 1 / 5 ** 11 },
      },
    ];

    for (const t of tests) {
      expect(
        getSampledTraceEventsIndex(
          'profiling-events-all',
          targetSampleSize,
          t.sampleCountFromPow6,
          initialExp
        )
      ).toEqual(t.expected);
    }
  });
});
