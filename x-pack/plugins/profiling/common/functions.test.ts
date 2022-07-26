/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTopNFunctions } from './functions';

import { events, stackTraces, stackFrames, executables } from './__fixtures__/stacktraces';

describe('TopN function operations', () => {
  test('1', () => {
    const topNFunctions = createTopNFunctions(events, stackTraces, stackFrames, executables, 0, 5);

    expect(topNFunctions.TotalCount).toEqual(40);
    expect(topNFunctions.TopN.length).toEqual(5);

    const exclusiveCounts = topNFunctions.TopN.map((value) => value.CountExclusive);
    expect(exclusiveCounts).toEqual([16, 10, 9, 5, 0]);
  });
});
