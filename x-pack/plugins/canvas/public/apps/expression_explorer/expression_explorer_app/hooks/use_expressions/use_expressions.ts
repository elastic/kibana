/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionAstExpression } from 'src/plugins/expressions';
import { fromExpression } from '@kbn/interpreter/target/common';

import { getExpressionsService } from '../../lib/expressions';
import { getFunctions } from '../../lib/functions';

import { createUseContext } from '../../lib/create_use_context';

import {
  setExpression as setExpressionAction,
  setExpressionAst,
  setExpressionDebug,
  setExpressionError,
  setExpressionResult,
  initialState,
  reducer,
} from './store';

const { Provider, useRead, useActions } = createUseContext(reducer, initialState, 'Expressions');

export const ExpressionsProvider = Provider;
export const useExpressions = useRead;

export const useExpressionsActions = () => {
  const dispatch = useActions();
  const expressionsService = getExpressionsService(getFunctions());

  const setExpression = (value: string) => {
    let ast: ExpressionAstExpression | null = null;

    dispatch(setExpressionAction(value));

    try {
      ast = fromExpression(value);
      dispatch(setExpressionAst(ast));
    } catch (e) {
      ast = null;
      dispatch(setExpressionError(e, { ast, result: null, debug: null }));
      return;
    }

    const runInterpreter = async () => {
      if (!ast) {
        dispatch(setExpressionResult(null));
        dispatch(setExpressionDebug(null));
        return;
      }

      try {
        const execution = expressionsService.getExecution(ast);
        const result = await execution.result;
        dispatch(setExpressionDebug(execution.state.get().ast.chain));
        dispatch(setExpressionResult(result as ExpressionAstExpression));
      } catch (e) {
        dispatch(setExpressionError(e, { result: null, debug: null }));
      }
    };

    if (ast) {
      runInterpreter();
    }
  };

  return {
    setExpression,
  };
};
