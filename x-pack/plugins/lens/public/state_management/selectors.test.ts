/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAppState, selectAppliedState, selectChangesApplied } from '.';

describe('lens selectors', () => {
  it('should select applied state', () => {
    const lensState = {
      appliedState: {
        visualization: {
          activeId: 'some-id',
          state: {},
        },
        datasourceStates: {
          indexpattern: {
            isLoading: false,
            state: {},
          },
        },
      },
    } as Partial<LensAppState>;

    expect(selectAppliedState({ lens: lensState as LensAppState })).toStrictEqual(
      lensState.appliedState
    );
  });

  it('should select changes applied', () => {
    const stateWithChangesApplied = {
      visualization: {
        activeId: 'some-id',
        state: {},
      },
      datasourceStates: {
        indexpattern: {
          isLoading: false,
          state: {},
        },
      },
      appliedState: {
        visualization: {
          activeId: 'some-id',
          state: {},
        },
        datasourceStates: {
          indexpattern: {
            isLoading: false,
            state: {},
          },
        },
      },
    } as Partial<LensAppState>;

    expect(selectChangesApplied({ lens: stateWithChangesApplied as LensAppState })).toBeTruthy();

    const stateWithChangesNOTApplied = {
      visualization: {
        activeId: 'some-other-id',
        state: {
          something: 'changed',
        },
      },
      datasourceStates: {
        indexpattern: {
          isLoading: false,
          state: {
            something: 'changed',
          },
        },
      },
      appliedState: {
        visualization: {
          activeId: 'some-id',
          state: {},
        },
        datasourceStates: {
          indexpattern: {
            isLoading: false,
            state: {},
          },
        },
      },
    } as unknown as LensAppState;

    expect(selectChangesApplied({ lens: stateWithChangesNOTApplied as LensAppState })).toBeFalsy();
  });
});
