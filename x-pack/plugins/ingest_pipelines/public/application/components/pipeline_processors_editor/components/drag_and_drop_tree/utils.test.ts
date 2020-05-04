/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { resolveDestinationLocation } from './utils';

describe('Resolve destination location', () => {
  it('resolves to root level when dragged to top', () => {
    const testItems = [['0'], ['0', 'onFailure', '0']];
    const result = resolveDestinationLocation(testItems, 0);
    expect(result).toEqual({ selector: [], index: 0 });
  });

  it('resolves to root level when dragged to bottom', () => {
    const testItems = [['0'], ['0', 'onFailure', '0']];
    const result = resolveDestinationLocation(testItems, testItems.length - 1);
    expect(result).toEqual({ selector: [], index: testItems.length - 1 });
  });

  it('displaces the current item if surrounded by items at same level', () => {
    const testItems = [['0'], ['0', 'onFailure', '0'], ['0', 'onFailure', '1']];
    const result = resolveDestinationLocation(testItems, 1);
    expect(result).toEqual({ selector: ['0', 'onFailure'], index: 0 });
  });

  it('displaces bottom item if surrounding items are at different levels', () => {
    const testItems1 = [
      ['0'],
      ['0', 'onFailure', '0'],
      ['0', 'onFailure', '1'],
      ['0', 'onFailure', '1', 'onFailure', '0'],
      ['0', 'onFailure', '1', 'onFailure', '1'],
    ];

    const result1 = resolveDestinationLocation(testItems1, 3);
    expect(result1).toEqual({
      selector: ['0', 'onFailure', '1', 'onFailure'],
      index: 0,
    });

    const testItems2 = [
      ['0'],
      ['0', 'onFailure', '0'],
      ['0', 'onFailure', '1', 'onFailure', '0'],
      ['0', 'onFailure', '1', 'onFailure', '1'],
      ['0', 'onFailure', '2'],
      ['0', 'onFailure', '3'],
    ];

    const result2 = resolveDestinationLocation(testItems2, 4);
    expect(result2).toEqual({ selector: ['0', 'onFailure'], index: 2 });
  });

  it('throws for bad array data', () => {
    const testItems = [
      ['0'],
      ['0', 'onFailure' /* should end in a number! */],
      ['0', 'onFailure' /* should end in a number! */],
    ];
    expect(() => resolveDestinationLocation(testItems, 1)).toThrow(
      'Expected an integer but received "onFailure"'
    );
  });
});
