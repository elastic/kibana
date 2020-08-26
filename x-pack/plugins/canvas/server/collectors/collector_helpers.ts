/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * @param ast: an ast that includes functions to track
 * @param cb: callback to do something with a function that has been found
 */

import {
  ExpressionAstExpression,
  ExpressionAstNode,
} from '../../../../../src/plugins/expressions/common';

function isExpression(
  maybeExpression: ExpressionAstNode
): maybeExpression is ExpressionAstExpression {
  return typeof maybeExpression === 'object' && maybeExpression.type === 'expression';
}

export function collectFns(ast: ExpressionAstNode, cb: (functionName: string) => void) {
  if (!isExpression(ast)) return;

  ast.chain.forEach(({ function: cFunction, arguments: cArguments }) => {
    cb(cFunction);

    // recurse the arguments and update the set along the way
    Object.keys(cArguments).forEach((argName) => {
      cArguments[argName].forEach((subAst) => {
        if (subAst != null) {
          collectFns(subAst, cb);
        }
      });
    });
  });
}

export function getRenderFunction(ast: ExpressionAstNode) {
  const { chain } = ast;

  if (chain.length === 0) {
    return undefined;
  }

  // Take a best guess at pulling the function
  // that will be used for rendering.
  // If the `render` function is the last function
  // in the chain, use the second to last function instead
  const lastFn = chain[chain.length - 1];
  if (lastFn.function !== 'render') {
    return lastFn.function;
  }

  if (chain.length === 1) {
    return undefined;
  }

  const secondToLastFn = chain[chain.length - 2];
  return secondToLastFn.function;
}
