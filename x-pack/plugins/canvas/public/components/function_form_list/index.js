/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compose, withProps } from 'recompose';
import { get } from 'lodash';
import { toExpression } from '@kbn/interpreter';
import { pluginServices } from '../../services';
import { getArgTypeDef } from '../../lib/args';
import { FunctionFormList as Component } from './function_form_list';

function normalizeContext(chain) {
  if (!Array.isArray(chain) || !chain.length) {
    return null;
  }
  return { type: 'expression', chain };
}

function getExpression(ast) {
  return ast != null && ast.type === 'expression' ? toExpression(ast) : ast;
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

const buildPath = (prevPath = '', argName, index, removable = false) => {
  const newPath = index === undefined ? argName : `${argName}.${index}`;
  return { path: prevPath.length ? `${prevPath}.${newPath}` : newPath, removable };
};

const componentFactory = ({
  args,
  argsWithExprFunctions,
  argType,
  argTypeDef,
  argumentsView,
  argUiConfig,
  prevContext,
  expressionIndex,
  nextArg,
  path,
  parentPath,
  removable,
}) => {
  const { expressions } = pluginServices.getServices();
  return {
    args,
    nestedFunctionsArgs: argsWithExprFunctions,
    argType: argType.function,
    argTypeDef: Object.assign(argTypeDef, {
      args: argumentsView,
      name: argUiConfig?.name ?? argTypeDef.name,
      displayName: argUiConfig?.displayName ?? argTypeDef.displayName,
      help: argUiConfig?.help ?? argTypeDef.name,
    }),
    argResolver: (argAst) => expressions.interpretAst(argAst, prevContext),
    contextExpression: getExpression(prevContext),
    expressionIndex, // preserve the index in the AST
    nextArgType: nextArg && nextArg.function,
    path,
    parentPath,
    removable,
  };
};

/**
 * Converts expression functions at the arguments for the expression, to the array of UI component configurations.
 * @param {Ast['chain'][number]['arguments']} complexArgs - expression's arguments, which are expression functions.
 * @param {object[]} complexArgumentsViews - argument UI views/models/tranforms.
 * @param {string} argumentPath - path at the AST to the current expression.
 * @returns flatten array of the arguments UI configurations.
 */
const transformNestedFunctionsToUIConfig = (complexArgs, complexArgumentsViews, argumentPath) =>
  Object.keys(complexArgs).reduce((current, argName) => {
    const next = complexArgs[argName]
      .map(({ chain }, index) =>
        transformFunctionsToUIConfig(
          chain,
          buildPath(argumentPath, argName, index, true),
          complexArgumentsViews?.find((argView) => argView.name === argName)
        )
      )
      .reduce(
        (current, next) => mergeComponentsAndContexts(current, next),
        createComponentsWithContext()
      );
    return mergeComponentsAndContexts(current, next);
  }, createComponentsWithContext());

/**
 * Converts chain of expressions to the array of UI component configurations.
 * Recursively loops through the AST, detects expression functions inside
 * the expression chain of the top and nested levels, finds view/model/transform definition
 * for the found expression functions, splits arguments of the expression for two categories: simple and expression functions.
 * After, recursively loops through the nested expression functions, creates UI component configurations and flatten them to the array.
 *
 * @param {Ast['chain']} functionsChain - chain of expression functions.
 * @param {{ path: string, removable: boolean }} functionMeta - saves the path to the current expressions chain at the original AST
 * and saves the information about that it can be removed (is an argument of the other expression).
 * @param {object} argUiConfig - Argument UI configuration of the element, which contains current expressions chain. It can be view, model, transform or argument.
 * @returns UI component configurations of expressions, found at AST.
 */
function transformFunctionsToUIConfig(functionsChain, { path, removable }, argUiConfig) {
  const parentPath = path;
  const argumentsPath = path ? `${path}.chain` : `chain`;
  return functionsChain.reduce((current, argType, i) => {
    const argumentPath = `${argumentsPath}.${i}.arguments`;
    const argTypeDef = getArgTypeDef(argType.function);
    current.context = current.context.concat(argType);

    // filter out argTypes that shouldn't be in the sidebar
    if (!argTypeDef) {
      return current;
    }

    const { argumentsView, args } = getPureArgs(argTypeDef, argType.arguments);
    const { argumentsView: exprFunctionsViews, args: argsWithExprFunctions } = getComplexArgs(
      argTypeDef,
      argType.arguments
    );

    // wrap each part of the chain in ArgType, passing in the previous context
    const component = componentFactory({
      args,
      argsWithExprFunctions,
      argType,
      argTypeDef,
      argumentsView,
      argUiConfig,
      prevContext: normalizeContext(current.context),
      expressionIndex: i, // preserve the index in the AST
      nextArg: functionsChain[i + 1] || null,
      path: argumentPath,
      parentPath,
      removable,
    });

    const components = transformNestedFunctionsToUIConfig(
      argsWithExprFunctions,
      exprFunctionsViews,
      argumentPath
    );

    return mergeComponentsAndContexts(current, {
      ...components,
      mapped: [component, ...components.mapped],
    });
  }, createComponentsWithContext());
}

const functionFormItems = withProps((props) => {
  const selectedElement = props.element;
  const functionsChain = get(selectedElement, 'ast.chain', []);
  // map argTypes from AST, attaching nextArgType if one exists
  const functionsListItems = transformFunctionsToUIConfig(functionsChain, buildPath('', 'ast'));
  return {
    functionFormItems: functionsListItems.mapped,
  };
});

export const FunctionFormList = compose(functionFormItems)(Component);
