/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Immutable } from '../../../../../common/endpoint/types';
import { EventFiltersListPageState } from '../state';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '../../../../../public/shared_imports';

export const getFormEntry = (
  state: Immutable<EventFiltersListPageState>
): CreateExceptionListItemSchema | ExceptionListItemSchema | undefined => {
  return state.form.entry;
};
