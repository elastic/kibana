/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GlobalState } from './reducer';
import * as alertListSelectors from './alerts/selectors';

export const alertListData = composeSelectors(
  alertListStateSelector,
  alertListSelectors.alertListData
);

/**
 * Returns the alert list state from within Global State
 */
function alertListStateSelector(state: GlobalState) {
  return state.alertList;
}

/**
 * Calls the `secondSelector` with the result of the `selector`. Use this when re-exporting a
 * concern-specific selector. `selector` should return the concern-specific state.
 */
function composeSelectors<OuterState, InnerState, ReturnValue>(
  selector: (state: OuterState) => InnerState,
  secondSelector: (state: InnerState) => ReturnValue
): (state: OuterState) => ReturnValue {
  return state => secondSelector(selector(state));
}
