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
        activeDatasourceId: 'foobar',
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

  describe('selecting changes applied', () => {
    it('should be true when applied state matches working state', () => {
      const lensState = {
        activeDatasourceId: 'foobar',
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
          activeDatasourceId: 'foobar',
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

      expect(selectChangesApplied({ lens: lensState as LensAppState })).toBeTruthy();
    });

    it('should be true when no applied state (auto-apply enabled)', () => {
      const lensState = {
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
        appliedState: undefined,
      } as Partial<LensAppState>;

      expect(selectChangesApplied({ lens: lensState as LensAppState })).toBeTruthy();
    });

    it('should be false when applied state differs from working state', () => {
      const lensState = {
        activeDatasourceId: 'foobar',
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
          activeDatasourceId: 'foobar',
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

      expect(selectChangesApplied({ lens: lensState as LensAppState })).toBeFalsy();
    });
  });
});
