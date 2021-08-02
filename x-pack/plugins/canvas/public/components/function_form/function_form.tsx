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
import { ExpressionType } from './types';
import { ArgType, Arg, ArgTypeDef } from '../../expression_types/types';
import { AssetType, CanvasElement, ExpressionContext } from '../../../types';

interface FunctionFormProps {
  argResolver: (ast: ExpressionAstExpression) => Promise<ExpressionValue>;
  args: Arg[];
  argType: ArgType;
  argTypeDef: ArgTypeDef;
  filterGroups: string[];
  context?: ExpressionContext;
  expressionIndex: number;
  expressionType: ExpressionType;
  nextArgType?: ArgType;
  nextExpressionType?: ExpressionType;
  onValueAdd: (argName: string, argValue: Arg) => () => void;
  onAssetAdd: (type: AssetType['type'], content: AssetType['value']) => string;
  onValueChange: (argName: string, argIndex: number) => (value: Arg) => void;
  onValueRemove: (argName: string, argIndex: number) => () => void;
  updateContext: (element?: CanvasElement) => void;
}

// helper to check the state of the passed in expression type
function is(
  state: ExpressionContext['state'],
  expressionType: ExpressionType,
  context?: ExpressionContext
) {
  const matchState = !context || context.state === state;
  return expressionType && expressionType.requiresContext && matchState;
}

export const FunctionForm: React.FunctionComponent<FunctionFormProps> = (props) => {
  const { expressionType, context } = props;

  if (!expressionType) {
    return <FunctionUnknown argType={props.argType} />;
  }

  if (is('pending', expressionType, context)) {
    return (
      <FunctionFormContextPending
        context={props.context}
        expressionType={props.expressionType}
        updateContext={props.updateContext}
      />
    );
  }

  if (is('error', expressionType, context)) {
    return (
      <FunctionFormContextError
        context={
          context ?? {
            state: 'error',
            error: 'Error occured',
            value: expressionType,
          }
        }
      />
    );
  }

  return <FunctionFormComponent {...props} />;
};
