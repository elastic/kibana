/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction, Reducer } from 'redux';
import * as flyoutActions from './actions';
import * as flyoutSelectors from './selectors';
import type { FlyoutState } from './types';

export { flyoutActions, flyoutSelectors };

export interface FlyoutPluginState {
  flyout: FlyoutState;
}

export interface FlyoutPluginReducer {
  flyout: Reducer<FlyoutState, AnyAction>;
}
