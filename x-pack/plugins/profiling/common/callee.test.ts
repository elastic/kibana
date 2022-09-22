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

    const tree = createCalleeTree(events, stackTraces, stackFrames, executables);

    expect(tree.root.Samples).toEqual(totalSamples);
    expect(tree.root.CountInclusive).toEqual(totalSamples);
    expect(tree.root.CountExclusive).toEqual(0);
  });
});
