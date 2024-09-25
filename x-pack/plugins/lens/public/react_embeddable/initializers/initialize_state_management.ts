/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ComparatorDefinition, StateComparators } from '@kbn/presentation-publishing';
import fastIsEqual from 'fast-deep-equal';
import { noop } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { IntegrationCallbacks, LensRuntimeState } from '../types';
import { buildObservableVariable } from '../helper';

export function createComparatorForStatePortion<K extends keyof LensRuntimeState>(
  state$: BehaviorSubject<LensRuntimeState>,
  portion: K
): ComparatorDefinition<LensRuntimeState, K> {
  // need to wrap it in a behaviour subject to make it happy
  const portion$ = new BehaviorSubject<LensRuntimeState[K]>(state$.getValue()[portion]);
  return [
    portion$,
    (newValue: LensRuntimeState[K]) => {
      state$.next({ ...state$.getValue(), [portion]: newValue });
    },
    fastIsEqual,
  ];
}

/**
 * Due to inline editing we need something advanced to handle the state
 * management at the embeddable level, so here's the initializers for it
 */
export function initializeStateManagement(initialState: LensRuntimeState): {
  variables: {
    state$: BehaviorSubject<LensRuntimeState>;
    //
    dataViews$: BehaviorSubject<DataView[] | undefined>;
  };
  api: Pick<IntegrationCallbacks, 'updateState'>;
  serialize: () => LensRuntimeState;
  comparators: StateComparators<Pick<LensRuntimeState, 'attributes' | 'savedObjectId'>>;
  cleanup: () => void;
} {
  const state$ = new BehaviorSubject<LensRuntimeState>(initialState);
  const getCurrentState = () => state$.getValue();
  const [dataViews$] = buildObservableVariable<DataView[] | undefined>(undefined);
  return {
    variables: {
      state$,
      // export dataViews as variable to keep its BehaviorSubject type in order to be able to update it
      // later on will add it to the API too but with a reduced PublishSubject type
      dataViews$,
    },
    api: {
      updateState: (newState: LensRuntimeState) => state$.next(newState),
    },
    serialize: getCurrentState,
    comparators: {
      attributes: createComparatorForStatePortion(state$, 'attributes'),
      savedObjectId: createComparatorForStatePortion(state$, 'savedObjectId'),
    },
    cleanup: noop,
  };
}
