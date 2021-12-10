/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compose, withProps } from 'recompose';
import { get } from 'lodash';
import { toExpression } from '@kbn/interpreter/common';
import { interpretAst } from '../../lib/run_interpreter';
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

const isPureArgumentType = (arg) => !arg.type || arg.type === 'argument';

const reduceArgsByCondition = (argsObject, isMatchingCondition) =>
  Object.keys(argsObject).reduce((acc, argName) => {
    if (isMatchingCondition(argName)) {
      return { ...acc, [argName]: argsObject[argName] };
    }
    return acc;
  }, {});

const createComponentsWithContext = () => ({ mapped: [], context: [] });

const getPureArgs = (argTypeDef, args) => {
  const pureArgumentsView = argTypeDef.args.filter((arg) => isPureArgumentType(arg));
  const pureArgumentsNames = pureArgumentsView.map((arg) => arg.name);
  const pureArgs = reduceArgsByCondition(args, (argName) => pureArgumentsNames.includes(argName));
  return { args: pureArgs, argumentsView: pureArgumentsView };
};

const getComplexArgs = (argTypeDef, args) => {
  const complexArgumentsView = argTypeDef.args.filter((arg) => !isPureArgumentType(arg));
  const complexArgumentsNames = complexArgumentsView.map((arg) => arg.name);
  const complexArgs = reduceArgsByCondition(args, (argName) =>
    complexArgumentsNames.includes(argName)
  );
  return { args: complexArgs, argumentsView: complexArgumentsView };
};

const mergeComponentsAndContexts = (
  { context = [], mapped = [] },
  { context: nextContext = [], mapped: nextMapped = [] }
) => ({
  mapped: [...mapped, ...nextMapped],
  context: [...context, ...nextContext],
});

const buildPathName = (prevPath = '', argName, index) => {
  const newPath = `${argName}.${index}`;
  return prevPath.length ? `${prevPath}.${newPath}` : newPath;
};

const transformFunctionsToComponents = (functionsChain, path) => {
  const argumentsPath = path ? `${path}.chain` : `chain`;
  return functionsChain.reduce((current, argType, i) => {
    const argumentPath = `${argumentsPath}.${i}.arguments`;
    const argTypeDef = getArgTypeDef(argType.function);
    const prevContext = normalizeContext(current.context);
    const nextArg = functionsChain[i + 1] || null;
    current.context = current.context.concat(argType);

    // filter out argTypes that shouldn't be in the sidebar
    if (!argTypeDef) {
      return current;
    }

    const { argumentsView, args } = getPureArgs(argTypeDef, argType.arguments);
    const { args: complexArgs } = getComplexArgs(argTypeDef, argType.arguments);

    // wrap each part of the chain in ArgType, passing in the previous context
    const component = {
      args,
      argType: argType.function,
      argTypeDef: Object.assign(argTypeDef, { args: argumentsView }),
      argResolver: (argAst) => interpretAst(argAst, prevContext),
      contextExpression: getExpression(prevContext),
      expressionIndex: i, // preserve the index in the AST
      nextArgType: nextArg && nextArg.function,
      path: `${argumentPath}`,
    };

    const next = Object.keys(complexArgs).reduce((current, argName) => {
      const next = complexArgs[argName]
        .map(({ chain }, index) =>
          transformFunctionsToComponents(chain, buildPathName(argumentPath, argName, index))
        )
        .reduce(
          (current, next) => mergeComponentsAndContexts(current, next),
          createComponentsWithContext()
        );
      return mergeComponentsAndContexts(current, next);
    }, createComponentsWithContext());

    return mergeComponentsAndContexts(current, { ...next, mapped: [component, ...next.mapped] });
  }, createComponentsWithContext());
};

const functionFormItems = withProps((props) => {
  const selectedElement = props.element;
  const functionsChain = get(selectedElement, 'ast.chain', []);
  // map argTypes from AST, attaching nextArgType if one exists
  const functionsListItems = transformFunctionsToComponents(functionsChain, 'ast');
  return {
    functionFormItems: functionsListItems.mapped,
  };
});

export const FunctionFormList = compose(functionFormItems)(Component);
