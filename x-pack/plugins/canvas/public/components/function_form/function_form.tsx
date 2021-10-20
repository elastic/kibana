/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import deepEqual from 'react-fast-compare';
import { shallowEqual } from 'react-redux';
import { FunctionFormComponent as Component } from './function_form_component';
import { FunctionUnknown } from './function_unknown';
import { FunctionFormContextPending } from './function_form_context_pending';
import { FunctionFormContextError } from './function_form_context_error';
import { ExpressionContext } from '../../../types';
import { RenderArgData, ExpressionType } from '../../expression_types/types';

type FunctionFormProps = RenderArgData;

// helper to check the state of the passed in expression type
function is(
  state: ExpressionContext['state'],
  expressionType: ExpressionType,
  context?: ExpressionContext
) {
  const matchState = !context || context.state === state;
  return expressionType && expressionType.requiresContext && matchState;
}

const FunctionFormComponent: React.FunctionComponent<FunctionFormProps> = (props) => {
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

  return <Component {...props} />;
};

export const FunctionForm = memo(FunctionFormComponent, (prevProps, nextProps) => {
  const { context: prevContext, expressionType: prevExpressionType, args: prevArgs } = prevProps;
  const { context, expressionType, args } = nextProps;
  return (
    deepEqual(context, prevContext) &&
    shallowEqual(expressionType, prevExpressionType) &&
    shallowEqual(args, prevArgs)
  );
});
