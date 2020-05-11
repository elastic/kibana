/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'react';
import { produce } from 'immer';
import {
  ExpressionAstFunction,
  ExpressionAstExpression,
  ExpressionValueError,
  ExpressionValueBoxed,
} from 'src/plugins/expressions';

import { createActionFactory } from '../../lib/actions';

// TODO: needs to be added to src/plugins/expressions...?
type ExpressionValueNull = ExpressionValueBoxed<'null'>;

type Ast = ExpressionAstExpression | ExpressionValueError | ExpressionValueNull;

export enum ExpressionsActions {
  SET_EXPRESSION = 'SET_EXPRESSION',
  SET_AST = 'SET_AST',
  SET_DEBUG = 'SET_DEBUG',
  SET_ERROR = 'SET_ERROR',
  SET_RESULT = 'SET_RESULT',
}

export type ExpressionsAction = ReturnType<typeof actions[keyof typeof actions]>;

export interface Store {
  expression: string;
  ast: Ast | null;
  debug: ExpressionAstFunction[] | null;
  result: Ast | null;
  error: Error | null;
}

const createAction = createActionFactory<ExpressionsActions>();

export const setExpression = (expression: string) =>
  createAction(ExpressionsActions.SET_EXPRESSION, { expression });

export const setExpressionError = (
  error: Error,
  resets?: { ast?: Store['ast']; debug?: Store['debug']; result?: Store['result'] }
) => createAction(ExpressionsActions.SET_ERROR, { error, resets });

export const setExpressionAst = (ast: Ast | null) =>
  createAction(ExpressionsActions.SET_AST, { ast });

export const setExpressionDebug = (debug: ExpressionAstFunction[] | null) =>
  createAction(ExpressionsActions.SET_DEBUG, { debug });

export const setExpressionResult = (result: Ast | null) =>
  createAction(ExpressionsActions.SET_RESULT, { result });

const actions = {
  setExpression,
  setExpressionAst,
  setExpressionDebug,
  setExpressionError,
  setExpressionResult,
};

export const initialState: Store = {
  expression: '',
  ast: null,
  debug: null,
  result: null,
  error: null,
};

export const reducer: Reducer<Store, ExpressionsAction> = (state, action) =>
  produce<Store>(state, draft => {
    switch (action.type) {
      case ExpressionsActions.SET_EXPRESSION: {
        const { expression } = action.payload;
        draft.expression = expression;
        draft.error = null;
        return;
      }

      case ExpressionsActions.SET_AST: {
        const { ast } = action.payload;
        draft.ast = ast;
        draft.error = null;
        return;
      }

      case ExpressionsActions.SET_DEBUG: {
        const { debug } = action.payload;
        draft.debug = debug;
        draft.error = null;
        return;
      }

      case ExpressionsActions.SET_ERROR: {
        const { error, resets } = action.payload;
        draft.error = error;

        if (resets) {
          (Object.keys(resets) as Array<keyof typeof resets>).forEach(key => (draft[key] = null));
        }
        return;
      }

      case ExpressionsActions.SET_RESULT: {
        const { result } = action.payload;

        if (!result) {
          draft.result = null;
          return;
        } else if (result.type === 'error' || result.type === 'null') {
          draft.result = null;
          draft.error = new Error('Unable to get renderable expression.');
          return;
        }

        draft.result = result;
        draft.error = null;
        return;
      }
    }
  });
