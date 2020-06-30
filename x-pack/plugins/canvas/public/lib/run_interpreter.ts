/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromExpression, getType } from '@kbn/interpreter/common';
import { ExpressionValue, ExpressionAstExpression } from 'src/plugins/expressions/public';
import { notifyService, expressionsService } from '../services';

interface Options {
  castToRender?: boolean;
}

/**
 * Meant to be a replacement for plugins/interpreter/interpretAST
 */
export async function interpretAst(ast: ExpressionAstExpression): Promise<ExpressionValue> {
  return await expressionsService.getService().execute(ast).getData();
}

/**
 * Runs interpreter, usually in the browser
 *
 * @param {object} ast - Executable AST
 * @param {any} input - Initial input for AST execution
 * @param {object} options
 * @param {boolean} options.castToRender - try to cast to a type: render object?
 * @returns {promise}
 */
export async function runInterpreter(
  ast: ExpressionAstExpression,
  input: ExpressionValue,
  options: Options = {}
): Promise<ExpressionValue> {
  try {
    const renderable = await expressionsService.getService().execute(ast, input).getData();

    if (getType(renderable) === 'render') {
      return renderable;
    }

    if (options.castToRender) {
      return runInterpreter(fromExpression('render'), renderable, {
        castToRender: false,
      });
    }

    throw new Error(`Ack! I don't know how to render a '${getType(renderable)}'`);
  } catch (err) {
    notifyService.getService().error(err);
    throw err;
  }
}
