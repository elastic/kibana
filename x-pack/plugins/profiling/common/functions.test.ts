/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTopNFunctions } from './functions';

import { events, stackTraces, stackFrames, executables } from './__fixtures__/stacktraces';
import { sum } from 'lodash';

describe('TopN function operations', () => {
  test('1', () => {
    const maxTopN = 5;
    const totalSamples = sum([...events.values()]);
    const topNFunctions = createTopNFunctions(
      events,
      stackTraces,
      stackFrames,
      executables,
      0,
      maxTopN
    );

    expect(topNFunctions.TotalCount).toEqual(totalSamples);
    expect(topNFunctions.TopN.length).toEqual(maxTopN);

    const exclusiveCounts = topNFunctions.TopN.map((value) => value.CountExclusive);
    expect(exclusiveCounts).toEqual([16, 9, 7, 5, 2]);
  });
});
