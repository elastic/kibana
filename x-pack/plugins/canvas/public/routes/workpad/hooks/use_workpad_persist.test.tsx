/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import React, { useRef } from 'react';
import { Subject, Observable, of, delay, map } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { syncUpdatesStream, useWorkpadPersist, UpdateRequest } from './use_workpad_persist';

const UPDATE_WORKPAD = 'update-workpad';
const UPDATE = 'update';
const UPDATE_ASSETS = 'update-assets';

const mockGetState = jest.fn();
const mockUpdateWorkpad = jest.fn();
const mockUpdateAssets = jest.fn();
const mockUpdate = jest.fn();

const mockNotifyError = jest.fn();

let updateRequests$: Subject<UpdateRequest>;

// Mock the hooks and actions used by the UseWorkpad hook
jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector(mockGetState()),
}));

jest.mock('../../../services', () => ({
  useWorkpadService: () => {
    mockUpdateWorkpad.mockImplementation(() => UPDATE_WORKPAD);
    mockUpdateAssets.mockImplementation(() => UPDATE_ASSETS);
    mockUpdate.mockImplementation(() => UPDATE);

    return {
      updateWorkpad: mockUpdateWorkpad,
      updateAssets: mockUpdateAssets,
      update: mockUpdate,
    };
  },
  useNotifyService: () => ({
    error: mockNotifyError,
  }),
}));

describe('useWorkpadPersist', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    updateRequests$ = new Subject<() => Observable<string>>();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test('initial render does not persist state', () => {
    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
    };

    mockGetState.mockReturnValue(state);

    renderHook(useWorkpadPersist);

    expect(mockUpdateWorkpad).not.toBeCalled();
    expect(mockUpdateAssets).not.toBeCalled();
    expect(mockUpdate).not.toBeCalled();
  });

  test('changes to workpad cause a workpad update', () => {
    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
    };

    mockGetState.mockReturnValue(state);

    const { rerender } = renderHook(useWorkpadPersist);

    const newState = {
      ...state,
      persistent: {
        workpad: { new: 'workpad' },
      },
    };
    mockGetState.mockReturnValue(newState);

    rerender();

    expect(mockUpdateWorkpad).toHaveBeenCalled();
  });

  test('changes to assets cause an asset update', () => {
    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
    };

    mockGetState.mockReturnValue(state);

    const { rerender } = renderHook(useWorkpadPersist);

    const newState = {
      ...state,
      assets: {
        asset1: 'some asset',
      },
    };
    mockGetState.mockReturnValue(newState);

    rerender();

    expect(mockUpdateAssets).toHaveBeenCalled();
  });

  test('changes to both assets and workpad causes a full update', () => {
    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
    };

    mockGetState.mockReturnValue(state);

    const { rerender } = renderHook(useWorkpadPersist);

    const newState = {
      persistent: {
        workpad: { new: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
      },
    };
    mockGetState.mockReturnValue(newState);

    rerender();

    expect(mockUpdate).toHaveBeenCalled();
  });

  test('non changes causes no updated', () => {
    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
    };
    mockGetState.mockReturnValue(state);

    const { rerender } = renderHook(useWorkpadPersist);

    rerender();

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpdateWorkpad).not.toHaveBeenCalled();
    expect(mockUpdateAssets).not.toHaveBeenCalled();
  });

  test('non write permissions causes no updates', () => {
    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
      transient: {
        canUserWrite: false,
      },
    };
    mockGetState.mockReturnValue(state);

    const { rerender } = renderHook(useWorkpadPersist);

    const newState = {
      persistent: {
        workpad: { new: 'workpad value' },
      },
      assets: {
        asset3: 'something',
      },
      transient: {
        canUserWrite: false,
      },
    };
    mockGetState.mockReturnValue(newState);

    rerender();

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpdateWorkpad).not.toHaveBeenCalled();
    expect(mockUpdateAssets).not.toHaveBeenCalled();
  });

  test('waiting for the update to be performed before the execution of the next one', () => {
    jest.spyOn(React, 'useRef').mockImplementationOnce((value?: unknown | null) => {
      return useRef(updateRequests$);
    });

    jest.spyOn(React, 'useRef').mockImplementation(useRef);

    const fnsOrder: Record<number, string> = {
      0: UPDATE_ASSETS,
      1: UPDATE_WORKPAD,
      2: UPDATE,
    };

    let updateRequestNumber = 0;
    updateRequests$.asObservable().subscribe((value) => {
      expect(value()).toBe(fnsOrder[updateRequestNumber]);
      updateRequestNumber++;
    });

    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
      transient: {
        canUserWrite: true,
      },
    };
    mockGetState.mockReturnValue(state);
    const { rerender } = renderHook(useWorkpadPersist);

    // Changing assets. `updateAssets` should be enqueued.
    const nextState1 = { ...state, assets: { asset1: 'some asset' } };
    mockGetState.mockReturnValue(nextState1);
    rerender();

    // Changing workpad. `updateWorkpad` should be enqueued.
    const nextState2 = { ...nextState1, persistent: { workpad: { other: 'workpad' } } };
    mockGetState.mockReturnValue(nextState2);
    rerender();

    // Changing workpad and assets. `update` should be enqueued.
    const nextState3 = {
      ...state,
      persistent: { workpad: { other: 'workpad-new' }, assets: { asset3: 'some asset' } },
    };
    mockGetState.mockReturnValue(nextState3);
    rerender();
  });
});

describe('syncUpdatesStream', () => {
  let testScheduler: TestScheduler;
  const mockErrorFn = jest.fn();

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should wait of the previous observer/promise completion before running the next', () => {
    testScheduler.run(({ expectObservable }) => {
      const updateFns = [1, 2, 3, 4].map((value) => () => of(value).pipe(delay(10, testScheduler)));

      const input$ = of(...updateFns);
      const output$ = syncUpdatesStream(input$, (err) => {});

      expectObservable(output$, '41ms !').toBe('10ms a 9ms b 9ms c 9ms (d|)', {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
      });
    });
  });

  it('should continue processing the update requests, if some has thrown an error', () => {
    const error = new Error('OOOPS');

    testScheduler.run(({ expectObservable }) => {
      const [firstUpdateFn, ...restUpdateFns] = [1, 2, 3, 4].map(
        (value) => () => of(value).pipe(delay(10, testScheduler))
      );
      const throwErrorFn = () =>
        of([1]).pipe(
          delay(10, testScheduler),
          map(() => {
            throw error;
          })
        );

      const input$ = of(firstUpdateFn, throwErrorFn, ...restUpdateFns);
      const output$ = syncUpdatesStream(input$, mockErrorFn);

      expectObservable(output$, '51ms !').toBe('10ms a 10ms 9ms b 9ms c 9ms (d|)', {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
      });
    });
    expect(mockErrorFn).toHaveBeenCalledWith(error);
  });
});
