/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, Action } from 'redux';
// @ts-expect-error untyped dependency
import { createThunk as createThunkFn } from 'redux-thunks/cjs';
import { State } from '../../types';

type CreateThunk = <Arguments extends any[]>(
  type: string,
  fn: (
    params: { type: string; dispatch: Dispatch; getState: () => State },
    ...args: Arguments
  ) => void
) => (...args: Arguments) => Action<Arguments>;

// This declaration exists because redux-thunks is not typed, and has a dependency on
// Canvas State.  Therefore, creating a wrapper that strongly-types the function-- and creates
// a single point of replacement, should the need arise-- is a nice workaround.
export const createThunk = createThunkFn as CreateThunk;
