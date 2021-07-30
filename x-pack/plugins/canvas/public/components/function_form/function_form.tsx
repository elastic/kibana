/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ExpressionAstExpression,
  ExpressionValue,
} from '../../../../../../src/plugins/expressions/common';
import { FunctionFormComponent } from './function_form_component';
import { FunctionUnknown } from './function_unknown';
import { FunctionFormContextPending } from './function_form_context_pending';
import { FunctionFormContextError } from './function_form_context_error';
import { State, Context, ExpressionType, ArgDefType } from './types';
import { ArgType, Arg } from '../../expression_types';

interface FunctionFormProps {
  argResolver: (ast: ExpressionAstExpression) => Promise<ExpressionValue>;
  args: Array<typeof Arg>;
  argType: typeof ArgType;
  argTypeDef: ArgDefType;
  filterGroups: string[];
  context?: Context;
  expressionIndex: number;
  expressionType: ExpressionType;
  nextArgType?: typeof ArgType;
  nextExpressionType?: ExpressionType;
  onValueAdd: (argName: string, argValue: unknown) => () => void;
  onAssetAdd: (type: string, content: string) => string;
  onValueChange: (argName: string, argIndex: number) => (value: unknown) => void;
  onValueRemove: (argName: string, argIndex: number) => () => void;
}

// helper to check the state of the passed in expression type
function is(state: State, expressionType: ExpressionType, context?: Context) {
  const matchState = !context || context.state === state;
  return expressionType && expressionType.requiresContext && matchState;
}

export const FunctionForm: React.FunctionComponent<FunctionFormProps> = (props) => {
  const { expressionType, context } = props;

  if (!expressionType) {
    return <FunctionUnknown {...props} />;
  }

  if (is('pending', expressionType, context)) {
    return <FunctionFormContextPending {...props} />;
  }

  if (is('error', expressionType, context)) {
    return <FunctionFormContextError {...props} context={context ?? { error: '' }} />;
  }

  return <FunctionFormComponent {...props} />;
};
