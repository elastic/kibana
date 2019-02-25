/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { interpretAst } from 'plugins/interpreter/interpreter';
import { compose, withProps } from 'recompose';
import { get } from 'lodash';
import { toExpression } from '@kbn/interpreter/common';
import { modelRegistry, viewRegistry, transformRegistry } from '../../expression_types';
import { FunctionFormList as Component } from './function_form_list';

function normalizeContext(chain) {
  if (!Array.isArray(chain) || !chain.length) {
    return null;
  }
  return {
    type: 'expression',
    chain,
  };
}

function getExpression(ast) {
  return ast != null && ast.type === 'expression' ? toExpression(ast) : ast;
}

function getArgTypeDef(fn) {
  return modelRegistry.get(fn) || viewRegistry.get(fn) || transformRegistry.get(fn);
}

const functionFormItems = withProps(props => {
  const selectedElement = props.element;
  const FunctionFormChain = get(selectedElement, 'ast.chain', []);

  // map argTypes from AST, attaching nextArgType if one exists
  const FunctionFormListItems = FunctionFormChain.reduce(
    (acc, argType, i) => {
      const argTypeDef = getArgTypeDef(argType.function);
      const prevContext = normalizeContext(acc.context);
      const nextArg = FunctionFormChain[i + 1] || null;

      // filter out argTypes that shouldn't be in the sidebar
      if (argTypeDef) {
        // wrap each part of the chain in ArgType, passing in the previous context
        const component = {
          args: argType.arguments,
          argType: argType.function,
          argTypeDef: argTypeDef,
          argResolver: argAst => interpretAst(argAst, prevContext),
          contextExpression: getExpression(prevContext),
          expressionIndex: i, // preserve the index in the AST
          nextArgType: nextArg && nextArg.function,
        };

        acc.mapped.push(component);
      }

      acc.context = acc.context.concat(argType);
      return acc;
    },
    { mapped: [], context: [] }
  );

  return {
    functionFormItems: FunctionFormListItems.mapped,
  };
});

export const FunctionFormList = compose(functionFormItems)(Component);
