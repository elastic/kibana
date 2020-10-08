/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducer, State } from './processors_reducer';
import { DropSpecialLocations } from '../constants';
import { PARENT_CHILD_NEST_ERROR } from './utils';

const initialState: State = {
  processors: [],
  onFailure: [],
  isRoot: true,
};

describe('Processors reducer', () => {
  it('reorders processors', () => {
    const processor1 = { id: expect.any(String), type: 'test1', options: {} };
    const processor2 = { id: expect.any(String), type: 'test2', options: {} };
    const processor3 = { id: expect.any(String), type: 'test3', options: {} };

    const s1 = reducer(initialState, {
      type: 'addProcessor',
      payload: { processor: processor1, targetSelector: ['processors'] },
    });
    const s2 = reducer(s1, {
      type: 'addProcessor',
      payload: { processor: processor2, targetSelector: ['processors'] },
    });
    const s3 = reducer(s2, {
      type: 'addProcessor',
      payload: { processor: processor3, targetSelector: ['processors'] },
    });

    expect(s3.processors).toEqual([processor1, processor2, processor3]);

    // Move the second processor to the first
    const s4 = reducer(s3, {
      type: 'moveProcessor',
      payload: {
        source: ['processors', '1'],
        destination: ['processors', '0'],
      },
    });

    expect(s4.processors).toEqual([processor2, processor1, processor3]);
  });

  it('moves and orders processors out of lists', () => {
    const processor1 = { id: expect.any(String), type: 'test1', options: {} };
    const processor2 = { id: expect.any(String), type: 'test2', options: {} };
    const processor3 = { id: expect.any(String), type: 'test3', options: {} };
    const processor4 = { id: expect.any(String), type: 'test4', options: {} };

    const s1 = reducer(initialState, {
      type: 'addProcessor',
      payload: { processor: processor1, targetSelector: ['processors'] },
    });
    const s2 = reducer(s1, {
      type: 'addProcessor',
      payload: { processor: processor2, targetSelector: ['processors'] },
    });

    const s3 = reducer(s2, {
      type: 'addProcessor',
      payload: { processor: processor3, targetSelector: ['processors', '1'] },
    });

    const s4 = reducer(s3, {
      type: 'addProcessor',
      payload: {
        processor: processor4,
        targetSelector: ['processors', '1', 'onFailure', '0'],
      },
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
        source: ['processors', '1', 'onFailure', '0'],
        destination: ['processors', '1'],
      },
    });

    expect(s5.processors).toEqual([
      processor1,
      { ...processor3, onFailure: [processor4] },
      { ...processor2, onFailure: undefined },
    ]);
  });

  it('moves and orders processors into lists', () => {
    const processor1 = { id: expect.any(String), type: 'test1', options: {} };
    const processor2 = { id: expect.any(String), type: 'test2', options: {} };
    const processor3 = { id: expect.any(String), type: 'test3', options: {} };
    const processor4 = { id: expect.any(String), type: 'test4', options: {} };

    const s1 = reducer(initialState, {
      type: 'addProcessor',
      payload: { processor: processor1, targetSelector: ['processors'] },
    });
    const s2 = reducer(s1, {
      type: 'addProcessor',
      payload: { processor: processor2, targetSelector: ['processors'] },
    });

    const s3 = reducer(s2, {
      type: 'addProcessor',
      payload: { processor: processor3, targetSelector: ['processors', '1'] },
    });

    const s4 = reducer(s3, {
      type: 'addProcessor',
      payload: {
        processor: processor4,
        targetSelector: ['processors', '1', 'onFailure', '0'],
      },
    });

    expect(s4.processors).toEqual([
      processor1,
      { ...processor2, onFailure: [{ ...processor3, onFailure: [processor4] }] },
    ]);

    // Move the first processor to the deepest most on-failure processor's failure processor
    const s5 = reducer(s4, {
      type: 'moveProcessor',
      payload: {
        source: ['processors', '0'],
        destination: ['processors', '1', 'onFailure', '0', 'onFailure', '0', 'onFailure', '0'],
      },
    });

    expect(s5.processors).toEqual([
      {
        ...processor2,
        onFailure: [{ ...processor3, onFailure: [{ ...processor4, onFailure: [processor1] }] }],
      },
    ]);
  });

  it('handles sending processor to bottom correctly', () => {
    const processor1 = { id: expect.any(String), type: 'test1', options: {} };
    const processor2 = { id: expect.any(String), type: 'test2', options: {} };
    const processor3 = { id: expect.any(String), type: 'test3', options: {} };

    const s1 = reducer(initialState, {
      type: 'addProcessor',
      payload: { processor: processor1, targetSelector: ['processors'] },
    });

    const s2 = reducer(s1, {
      type: 'addProcessor',
      payload: { processor: processor2, targetSelector: ['processors'] },
    });

    const s3 = reducer(s2, {
      type: 'addProcessor',
      payload: { processor: processor3, targetSelector: ['processors'] },
    });

    // Move the parent into a child list
    const s4 = reducer(s3, {
      type: 'moveProcessor',
      payload: {
        source: ['processors', '0'],
        destination: ['processors', DropSpecialLocations.bottom],
      },
    });

    // Assert nothing changed
    expect(s4.processors).toEqual([processor2, processor3, processor1]);
  });

  it('will not set the root "onFailure" to "undefined" if it is empty', () => {
    const processor1 = { id: expect.any(String), type: 'test1', options: {} };
    const processor2 = { id: expect.any(String), type: 'test2', options: {} };

    const s1 = reducer(initialState, {
      type: 'addProcessor',
      payload: { processor: processor1, targetSelector: ['processors'] },
    });

    const s2 = reducer(s1, {
      type: 'addProcessor',
      payload: { processor: processor2, targetSelector: ['onFailure'] },
    });

    // Move the parent into a child list
    const s3 = reducer(s2, {
      type: 'moveProcessor',
      payload: {
        source: ['onFailure', '0'],
        destination: ['processors', '1'],
      },
    });

    expect(s3).toEqual({
      processors: [processor1, processor2],
      onFailure: [],
      isRoot: true,
    });
  });

  it('places copies and places the copied processor below the original', () => {
    const processor1 = { id: expect.any(String), type: 'test1', options: {} };
    const processor2 = { id: expect.any(String), type: 'test2', options: {} };
    const processor3 = { id: expect.any(String), type: 'test3', options: {} };
    const processor4 = {
      id: expect.any(String),
      type: 'test4',
      options: { field: 'field_name', value: 'field_value' },
    };

    const s1 = reducer(initialState, {
      type: 'addProcessor',
      payload: { processor: processor1, targetSelector: ['processors'] },
    });
    const s2 = reducer(s1, {
      type: 'addProcessor',
      payload: { processor: processor2, targetSelector: ['processors'] },
    });

    const s3 = reducer(s2, {
      type: 'addProcessor',
      payload: { processor: processor3, targetSelector: ['processors', '1'] },
    });

    const s4 = reducer(s3, {
      type: 'addProcessor',
      payload: {
        processor: processor4,
        targetSelector: ['processors', '1', 'onFailure', '0'],
      },
    });

    const s5 = reducer(s4, {
      type: 'duplicateProcessor',
      payload: { source: ['processors', '1', 'onFailure', '0', 'onFailure', '0'] },
    });

    const s6 = reducer(s5, {
      type: 'duplicateProcessor',
      payload: { source: ['processors', '1', 'onFailure', '0', 'onFailure', '0'] },
    });

    expect(s6.processors).toEqual([
      processor1,
      {
        ...processor2,
        onFailure: [
          {
            ...processor3,
            onFailure: [processor4, processor4, processor4],
          },
        ],
      },
    ]);
  });

  describe('Error conditions', () => {
    let originalErrorLogger: any;
    beforeEach(() => {
      // eslint-disable-next-line no-console
      originalErrorLogger = console.error;
      // eslint-disable-next-line no-console
      console.error = jest.fn();
    });

    afterEach(() => {
      // eslint-disable-next-line no-console
      console.error = originalErrorLogger;
    });

    it('prevents moving a parent into child list', () => {
      const processor1 = { id: expect.any(String), type: 'test1', options: {} };
      const processor2 = { id: expect.any(String), type: 'test2', options: {} };
      const processor3 = { id: expect.any(String), type: 'test3', options: {} };
      const processor4 = { id: expect.any(String), type: 'test4', options: {} };

      const s1 = reducer(initialState, {
        type: 'addProcessor',
        payload: { processor: processor1, targetSelector: ['processors'] },
      });

      const s2 = reducer(s1, {
        type: 'addProcessor',
        payload: { processor: processor2, targetSelector: ['processors'] },
      });

      const s3 = reducer(s2, {
        type: 'addProcessor',
        payload: { processor: processor3, targetSelector: ['processors', '1'] },
      });

      const s4 = reducer(s3, {
        type: 'addProcessor',
        payload: {
          processor: processor4,
          targetSelector: ['processors', '1', 'onFailure', '0'],
        },
      });

      expect(s4.processors).toEqual([
        processor1,
        { ...processor2, onFailure: [{ ...processor3, onFailure: [processor4] }] },
      ]);

      // Move the parent into a child list
      const s5 = reducer(s4, {
        type: 'moveProcessor',
        payload: {
          source: ['processors', '1'],
          destination: ['processors', '1', 'onFailure', '0', 'onFailure', '0', 'onFailure', '0'],
        },
      });

      // eslint-disable-next-line no-console
      expect(console.error).toHaveBeenCalledWith(new Error(PARENT_CHILD_NEST_ERROR));

      // Assert nothing changed
      expect(s5.processors).toEqual(s4.processors);
    });

    it('does not remove top level processor and onFailure arrays if they are emptied', () => {
      const processor1 = { id: expect.any(String), type: 'test1', options: {} };
      const s1 = reducer(initialState, {
        type: 'addProcessor',
        payload: { processor: processor1, targetSelector: ['processors'] },
      });
      const s2 = reducer(s1, {
        type: 'removeProcessor',
        payload: { selector: ['processors', '0'] },
      });
      expect(s2.processors).not.toBe(undefined);
    });

    it('throws for bad move processor', () => {
      const processor1 = { id: expect.any(String), type: 'test1', options: {} };
      const processor2 = { id: expect.any(String), type: 'test2', options: {} };

      const s1 = reducer(initialState, {
        type: 'addProcessor',
        payload: { processor: processor1, targetSelector: ['processors'] },
      });

      const s2 = reducer(s1, {
        type: 'addProcessor',
        payload: { processor: processor2, targetSelector: ['onFailure'] },
      });

      const s3 = reducer(s2, {
        type: 'moveProcessor',
        payload: {
          source: ['onFailure'],
          destination: ['processors'],
        },
      });

      // eslint-disable-next-line no-console
      expect(console.error).toHaveBeenCalledWith(
        new Error('Expected number but received "processors"')
      );

      expect(s3.processors).toEqual(s2.processors);
    });
  });
});
