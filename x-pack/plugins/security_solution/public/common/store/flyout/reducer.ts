/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { reducerWithInitialState } from 'typescript-fsa-reducers';
import {
  initializeSecurityFlyouts,
  closeSecurityFlyout,
  initializeSecurityFlyoutByScope,
} from './actions';
import { areValidSecurityFlyoutScopes } from './helpers';
import type { SecurityFlyoutState } from './model';

export const initialFlyoutsState: SecurityFlyoutState = {};

export const flyoutsReducer = reducerWithInitialState(initialFlyoutsState)
  /**
   * Open the  flyout for the given flyoutScope
   */
  .case(initializeSecurityFlyouts, (state, newFlyoutState) => {
    if (areValidSecurityFlyoutScopes(newFlyoutState)) {
      return merge({}, state, newFlyoutState);
    }
    return state;
  })
  /**
   * Open the  flyout for the given flyoutScope
   */
  .case(initializeSecurityFlyoutByScope, (state, { flyoutScope, panelKind, params }) => {
    return merge({}, state, {
      [flyoutScope]: {
        panelKind,
        params,
      },
    });
  })
  /**
   * Remove all the configuration to close a flyout
   */
  .case(closeSecurityFlyout, (state, { flyoutScope }) => {
    return merge({}, state, { [flyoutScope]: {} });
  })
  .build();
