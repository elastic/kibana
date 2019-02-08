/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { addError, removeError } from './actions';
import { ErrorModel } from './model';

export type ErrorState = ErrorModel;

export const initialErrorsState: ErrorState = [];

export const errorsReducer = reducerWithInitialState(initialErrorsState)
  .case(addError, (state, { id, title, message }) => state.concat({ id, title, message }))
  .case(removeError, (state, { id }) => state.filter(error => error.id !== id))
  .build();
