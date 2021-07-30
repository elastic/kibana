/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FunctionFormComponent } from './function_form_component';
import { FunctionUnknown } from './function_unknown';
import { FunctionFormContextPending } from './function_form_context_pending';
import { FunctionFormContextError } from './function_form_context_error';
import { View, Model, Transform } from '../../expression_types';

type State = 'ready' | 'error' | 'pending';
interface Context {
  error: string;
  state: State;
  value: unknown;
}

type ExpressionType = typeof View | typeof Model | typeof Transform;

interface FunctionFormProps {
  state: State;
  context: Context;
  expressionType: ExpressionType;
  argType: string;
  nextArgType?: string;
}

// helper to check the state of the passed in expression type
function is(state: State, expressionType: ExpressionType, context: Context) {
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
    return <FunctionFormContextError {...props} />;
  }

  return <FunctionFormComponent {...props} />;
};
