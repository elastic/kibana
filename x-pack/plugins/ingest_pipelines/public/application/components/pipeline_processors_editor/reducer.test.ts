/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducer, State } from './reducer';

const initialState: State = {
  processors: [],
  validate: () => Promise.resolve(true),
};

describe('Processors reducer', () => {
  it('reorders processors', () => {
    const processor1 = { type: 'test1', options: {} };
    const processor2 = { type: 'test2', options: {} };
    const processor3 = { type: 'test3', options: {} };

    const s1 = reducer(initialState, {
      type: 'addTopLevelProcessor',
      payload: { processor: processor1 },
    });
    const s2 = reducer(s1, {
      type: 'addTopLevelProcessor',
      payload: { processor: processor2 },
    });
    const s3 = reducer(s2, {
      type: 'addTopLevelProcessor',
      payload: { processor: processor3 },
    });

    expect(s3.processors).toEqual([processor1, processor2, processor3]);

    // Move the second processor to the first
    const s4 = reducer(s3, {
      type: 'moveProcessor',
      payload: { destination: { selector: [], index: 1 }, source: { selector: [], index: 0 } },
    });

    expect(s4.processors).toEqual([processor2, processor1, processor3]);
  });

  it('moves and orders processors out of lists', () => {
    const processor1 = { type: 'test1', options: {} };
    const processor2 = { type: 'test2', options: {} };
    const processor3 = { type: 'test3', options: {} };
    const processor4 = { type: 'test4', options: {} };

    const s1 = reducer(initialState, {
      type: 'addTopLevelProcessor',
      payload: { processor: processor1 },
    });

    const s2 = reducer(s1, {
      type: 'addTopLevelProcessor',
      payload: { processor: processor2 },
    });

    const s3 = reducer(s2, {
      type: 'addOnFailureProcessor',
      payload: { onFailureProcessor: processor3, targetSelector: ['1'] },
    });

    const s4 = reducer(s3, {
      type: 'addOnFailureProcessor',
      payload: { onFailureProcessor: processor4, targetSelector: ['1', 'onFailure', '0'] },
    });

    expect(s4.processors).toEqual([
      processor1,
      { ...processor2, onFailure: [{ ...processor3, onFailure: [processor4] }] },
    ]);

    // Move the first on failure processor of the second processors on failure processor
    // to the second position of the root level.
    const s5 = reducer(s4, {
      type: 'moveProcessor',
      payload: {
        source: { selector: ['1', 'onFailure'], index: 0 },
        destination: { selector: [], index: 1 },
      },
    });

    expect(s5.processors).toEqual([
      processor1,
      { ...processor3, onFailure: [processor4] },
      { ...processor2, onFailure: undefined },
    ]);
  });

  it('moves and orders processors into lists', () => {
    const processor1 = { type: 'test1', options: {} };
    const processor2 = { type: 'test2', options: {} };
    const processor3 = { type: 'test3', options: {} };
    const processor4 = { type: 'test4', options: {} };

    const s1 = reducer(initialState, {
      type: 'addTopLevelProcessor',
      payload: { processor: processor1 },
    });

    const s2 = reducer(s1, {
      type: 'addTopLevelProcessor',
      payload: { processor: processor2 },
    });

    const s3 = reducer(s2, {
      type: 'addOnFailureProcessor',
      payload: { onFailureProcessor: processor3, targetSelector: ['1'] },
    });

    const s4 = reducer(s3, {
      type: 'addOnFailureProcessor',
      payload: { onFailureProcessor: processor4, targetSelector: ['1', 'onFailure', '0'] },
    });

    expect(s4.processors).toEqual([
      processor1,
      { ...processor2, onFailure: [{ ...processor3, onFailure: [processor4] }] },
    ]);

    // Move the first processor to the deepest most on-failure processor's failure processor
    const s5 = reducer(s4, {
      type: 'moveProcessor',
      payload: {
        source: { selector: [], index: 0 },
        destination: { selector: ['1', 'onFailure', '0', 'onFailure', '0', 'onFailure'], index: 0 },
      },
    });

    expect(s5.processors).toEqual([
      {
        ...processor2,
        onFailure: [{ ...processor3, onFailure: [{ ...processor4, onFailure: [processor1] }] }],
      },
    ]);
  });

  it('prevents moving a parent into child list', () => {
    const processor1 = { type: 'test1', options: {} };
    const processor2 = { type: 'test2', options: {} };
    const processor3 = { type: 'test3', options: {} };
    const processor4 = { type: 'test4', options: {} };

    const s1 = reducer(initialState, {
      type: 'addTopLevelProcessor',
      payload: { processor: processor1 },
    });

    const s2 = reducer(s1, {
      type: 'addTopLevelProcessor',
      payload: { processor: processor2 },
    });

    const s3 = reducer(s2, {
      type: 'addOnFailureProcessor',
      payload: { onFailureProcessor: processor3, targetSelector: ['1'] },
    });

    const s4 = reducer(s3, {
      type: 'addOnFailureProcessor',
      payload: { onFailureProcessor: processor4, targetSelector: ['1', 'onFailure', '0'] },
    });

    expect(s4.processors).toEqual([
      processor1,
      { ...processor2, onFailure: [{ ...processor3, onFailure: [processor4] }] },
    ]);

    // Move the parent into a child list
    const s5 = reducer(s4, {
      type: 'moveProcessor',
      payload: {
        source: { selector: [], index: 1 },
        destination: { selector: ['1', 'onFailure', '0', 'onFailure', '0', 'onFailure'], index: 0 },
      },
    });

    // Assert nothing changed
    expect(s5.processors).toEqual(s4.processors);
  });
});
