/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, merge } from 'lodash';
import { reducerWithInitialState } from 'typescript-fsa-reducers';
import {
  initializeSecurityFlyoutFromUrl,
  closeSecurityFlyoutByScope,
  openSecurityFlyoutByScope,
} from './actions';
import { areUrlParamsValidSecurityFlyoutParams } from './helpers';
import type { SecurityFlyoutState } from './model';

export const initialFlyoutsState: SecurityFlyoutState = {};

export const flyoutsReducer = reducerWithInitialState(initialFlyoutsState)
  /**
   * Open the  flyout for the given flyoutScope
   */
  .case(initializeSecurityFlyoutFromUrl, (state, newFlyoutState) => {
    if (areUrlParamsValidSecurityFlyoutParams(newFlyoutState)) {
      return merge({}, state, newFlyoutState);
    }
    return state;
  })
  /**
   * Open the  flyout for the given flyoutScope
   */
  .case(openSecurityFlyoutByScope, (state, { flyoutScope, ...panelProps }) => {
    // We use merge as the spread operator copies nested objects, rather than creating a new object
    // The nested object may be opaque to a future developer so this protects against stale references
    const newState = merge({}, state, {
      [flyoutScope]: {
        ...panelProps,
      },
    });
    return newState;
  })
  /**
   * Remove the flyoutScope from state to close the flyout and remove it from url state
   */
  .case(closeSecurityFlyoutByScope, (state, { flyoutScope }) => {
    const newState = cloneDeep(state);
    delete newState[flyoutScope];
    return newState;
  })
  .build();
