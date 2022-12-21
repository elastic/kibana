/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression, toExpression } from '@kbn/interpreter';
import {
  modelRegistry,
  viewRegistry,
  transformRegistry,
  Model,
  View,
  Transform,
} from '../expression_types';
import { ArgUiConfig } from '../expression_types/arg';

type ArgType = Model | View | Transform;

export function getArgTypeDef(fn: string): ArgType {
  return modelRegistry.get(fn) || viewRegistry.get(fn) || transformRegistry.get(fn);
}

const buildArg = (arg: ArgUiConfig, expr: string) => `${arg.name}=${formatExpr(expr)}`;

const filterValidArguments = (args: Array<string | undefined>) =>
  args.filter((arg) => arg !== undefined);

const formatExpr = (expr: string) => {
  if (isWithBrackets(expr)) {
    const exprWithoutBrackets = removeFigureBrackets(expr);
    return toExpression(fromExpression(exprWithoutBrackets));
  }
  return expr;
};

const removeFigureBrackets = (expr: string) => {
  if (isWithBrackets(expr)) {
    return expr.substring(1, expr.length - 1);
  }
  return expr;
};

const isWithBrackets = (expr: string) => expr[0] === '{' && expr[expr.length - 1] === '}';

export function buildDefaultArgExpr(argUiConfig: ArgUiConfig): string | undefined {
  const argConfig = getArgTypeDef(argUiConfig.argType);
  if (argUiConfig.default) {
    return buildArg(argUiConfig, argUiConfig.default);
  }
  if (!argConfig) {
    return undefined;
  }

  const defaultArgs = argConfig.args.map((arg) => {
    const argConf = getArgTypeDef(arg.argType);

    if (arg.default && argConf && Array.isArray(argConf.args)) {
      return buildArg(arg, arg.default);
    }
    return buildDefaultArgExpr(arg);
  });

  const validArgs = filterValidArguments(defaultArgs);
  const defExpr = validArgs.length
    ? `{${argUiConfig.argType} ${validArgs.join(' ')}}`
    : `{${argUiConfig.argType}}`;

  return defExpr;
}
