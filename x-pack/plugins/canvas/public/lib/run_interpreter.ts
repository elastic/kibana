/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression, getType } from '@kbn/interpreter/common';
import { pluck } from 'rxjs/operators';
import { ExpressionValue, ExpressionAstExpression } from 'src/plugins/expressions/public';
import { pluginServices } from '../services';

interface Options {
  castToRender?: boolean;
}

/**
 * Meant to be a replacement for plugins/interpreter/interpretAST
 */
export async function interpretAst(
  ast: ExpressionAstExpression,
  variables: Record<string, any>
): Promise<ExpressionValue> {
  const context = { variables };
  const { execute } = pluginServices.getServices().expressions;
  return await execute(ast, null, context).getData().pipe(pluck('result')).toPromise();
}

/**
 * Runs interpreter, usually in the browser
 *
 * @param {object} ast - Executable AST
 * @param {any} input - Initial input for AST execution
 * @param {object} variables - Variables to pass in to the intrepreter context
 * @param {object} options
 * @param {boolean} options.castToRender - try to cast to a type: render object?
 * @returns {promise}
 */
export async function runInterpreter(
  ast: ExpressionAstExpression,
  input: ExpressionValue,
  variables: Record<string, any>,
  options: Options = {}
): Promise<ExpressionValue> {
  const context = { variables };

  try {
    const { execute } = pluginServices.getServices().expressions;
    const renderable = await execute(ast, input, context)
      .getData()
      .pipe(pluck('result'))
      .toPromise();

    if (getType(renderable) === 'render') {
      return renderable;
    }

    if (options.castToRender) {
      return runInterpreter(fromExpression('render'), renderable, variables, {
        castToRender: false,
      });
    }

    throw new Error(`Ack! I don't know how to render a '${getType(renderable)}'`);
  } catch (err) {
    const { error: displayError } = pluginServices.getServices().notify;
    displayError(err);
    throw err;
  }
}
