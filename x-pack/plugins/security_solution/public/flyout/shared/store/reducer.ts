/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { setEventId } from './actions';
import type { FlyoutState } from './types';

export const initialFlyoutState: FlyoutState = {
  flyout: {
    eventId: '',
  },
};

/** The reducer for all timeline actions  */
export const flyoutReducer = reducerWithInitialState(initialFlyoutState)
  .case(setEventId, (state, { eventId }) => ({
    ...state,
    flyout: {
      eventId,
    },
  }))
  .build();
