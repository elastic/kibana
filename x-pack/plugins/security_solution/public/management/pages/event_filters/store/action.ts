/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux';
import { ExceptionListItemSchema, CreateExceptionListItemSchema } from '../../../../shared_imports';
import { AsyncResourceState } from '../../../state/async_resource_state';

export type EventFiltersInitForm = Action<'eventFiltersInitForm'> & {
  payload: {
    entry: ExceptionListItemSchema | CreateExceptionListItemSchema;
  };
};

export type EventFiltersChangeForm = Action<'eventFiltersChangeForm'> & {
  payload: {
    entry: ExceptionListItemSchema | CreateExceptionListItemSchema;
    hasNameError?: boolean;
    hasItemsError?: boolean;
    hasOSError?: boolean;
  };
};

export type EventFiltersCreateStart = Action<'eventFiltersCreateStart'>;
export type EventFiltersCreateSuccess = Action<'eventFiltersCreateSuccess'> & {
  payload: {
    exception: ExceptionListItemSchema;
  };
};
export type EventFiltersCreateError = Action<'eventFiltersCreateError'>;

export type EventFiltersFormStateChanged = Action<'eventFiltersFormStateChanged'> & {
  payload: AsyncResourceState<ExceptionListItemSchema>;
};

export type EventFiltersPageAction =
  | EventFiltersCreateStart
  | EventFiltersInitForm
  | EventFiltersChangeForm
  | EventFiltersCreateStart
  | EventFiltersCreateSuccess
  | EventFiltersCreateError
  | EventFiltersFormStateChanged;
