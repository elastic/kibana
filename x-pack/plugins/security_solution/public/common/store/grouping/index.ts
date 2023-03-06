/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction, CombinedState, Reducer } from 'redux';
import * as groupActions from './actions';
import * as groupSelectors from './selectors';
import type { GroupState } from './types';

export * from './types';

export { groupActions, groupSelectors };

export interface GroupsReducer {
  groups: Reducer<CombinedState<GroupState>, AnyAction>;
}
