/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseState, BaseStateContainer } from '@kbn/kibana-utils-plugin/public';
import { map } from 'rxjs';

export const wrapStateContainer =
  <StateA extends BaseState, StateB extends BaseState>({
    wrapSet,
    wrapGet,
  }: {
    wrapSet: (state: StateB | null) => (previousState: StateA) => StateA;
    wrapGet: (state: StateA) => StateB;
  }) =>
  (stateContainer: BaseStateContainer<StateA>) => ({
    get: () => wrapGet(stateContainer.get()),
    set: (value: StateB | null) => stateContainer.set(wrapSet(value)(stateContainer.get())),
    state$: stateContainer.state$.pipe(map(wrapGet)),
  });
