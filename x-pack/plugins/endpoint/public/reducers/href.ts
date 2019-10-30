/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { userNavigated } from '../concerns/routing';

type HrefState = string | null;
const initialState: HrefState = null;

export function reducer(state = initialState, action: ReturnType<typeof userNavigated>): HrefState {
  switch (action.type) {
    case 'userNavigated':
      return action.payload[0];
    default:
      return state;
  }
}
