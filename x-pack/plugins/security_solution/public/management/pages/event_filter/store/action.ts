/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '../../../../../public/shared_imports';
import { AsyncResourceState } from '../../../state/async_resource_state';

export type EventFilterInitForm = Action<'eventFilterInitForm'> & {
  payload: {
    entry: ExceptionListItemSchema | CreateExceptionListItemSchema;
  };
};

export type EventFilterChangeForm = Action<'eventFilterChangeForm'> & {
  payload: {
    entry: ExceptionListItemSchema | CreateExceptionListItemSchema;
    hasError?: boolean;
  };
};

export type EventFilterCreateStart = Action<'eventFilterCreateStart'>;
export type EventFilterCreateSuccess = Action<'eventFilterCreateSuccess'> & {
  payload: {
    exception: ExceptionListItemSchema;
  };
};
export type EventFilterCreateError = Action<'eventFilterCreateError'>;

export type EventFilterFormStateChanged = Action<'eventFilterFormStateChanged'> & {
  payload: AsyncResourceState<ExceptionListItemSchema>;
};

export type EventFilterPageAction =
  | EventFilterCreateStart
  | EventFilterInitForm
  | EventFilterChangeForm
  | EventFilterCreateStart
  | EventFilterCreateSuccess
  | EventFilterCreateError
  | EventFilterFormStateChanged;
