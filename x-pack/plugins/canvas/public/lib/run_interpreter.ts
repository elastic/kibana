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
export async function interpretAst(
  ast: ExpressionAstExpression,
  variables: Record<string, any>
): Promise<ExpressionValue> {
  const context = { variables };
  const executor = expressionsService.getService().execute(ast, null, context, { debug: true });
  const finalData = await executor.getData();
  displayTiming(executor.getAst());
  return finalData;
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
  const context = { variables, debug: true };

  try {
    const executor = expressionsService.getService().execute(ast, input, context, { debug: true });
    const renderable = await executor.getData();
    displayTiming(executor.getAst());

    if (getType(renderable) === 'render') {
      return renderable;
    }
    debugger;

    if (options.castToRender) {
      return runInterpreter(fromExpression('render'), renderable, variables, {
        castToRender: false,
      });
    }

    throw new Error(`Ack! I don't know how to render a '${getType(renderable)}'`);
  } catch (err) {
    notifyService.getService().error(err);
    throw err;
  }
}

function forEachAst(ast, cb, depth) {
  ast.chain.forEach((f) => {
    cb(f, depth);
    Object.values(f.arguments).forEach((args) => {
      args.forEach((arg) => {
        if (typeof arg === 'object' && arg && arg.type === 'expression') {
          forEachAst(arg, cb, depth + 1);
        }
      });
    });
  });
}

function displayTiming(ast) {
  const times = [];
  forEachAst(
    ast,
    (fn, depth) => {
      times.push({
        name: fn.debug?.fn,
        duration_ms: fn.debug?.duration ?? 0,
        depth,
      });
    },
    0
  );
  console.table(times);
  console.log(
    'Total time',
    times.reduce((prev, current) => prev + current.duration_ms, 0)
  );
}
