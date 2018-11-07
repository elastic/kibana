/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsUnion, FunctionType } from '../../types';
import { createAction } from '../action_creator';

import * as t from '../action_types';

export const Actions = {
  apiAction: (label: string, scope: string, handler: FunctionType) =>
    createAction(t.API, { label, scope, handler }),
  apiStart: (label: string, scope: string) => createAction(t.API_START, { label, scope }),
  apiEnd: (label: string, scope: string) => createAction(t.API_END, { label, scope }),
  apiError: (error: object, scope: string) => createAction(t.API_ERROR, { error, scope }),
};

/**
 * TypeScript supports type declaration merging
 * so we can both export the object above and the type here
 */
export type Actions = ActionsUnion<typeof Actions>;
