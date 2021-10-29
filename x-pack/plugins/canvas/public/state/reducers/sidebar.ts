/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions } from 'redux-actions';
import { State } from '../../../types';
import { SetGroupFiltersByOptionType, SetGroupFiltersByOptionPayload } from '../actions/sidebar';

// @ts-expect-error untyped local
import { assignNodeProperties } from './elements';

export const sidebarReducer = handleActions<
  State['persistent']['workpad'],
  SetGroupFiltersByOptionPayload
>(
  {
    [SetGroupFiltersByOptionType]: (workpadState, { payload }) => {
      return {
        ...workpadState,
        sidebar: { ...(workpadState.sidebar ?? {}), groupFiltersByOption: payload },
      };
    },
  },
  {} as State['persistent']['workpad']
);
