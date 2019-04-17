/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { compose, branch, renderComponent } from 'recompose';
import { FunctionFormComponent } from './function_form_component';
import { FunctionUnknown } from './function_unknown';
import { FunctionFormContextPending } from './function_form_context_pending';
import { FunctionFormContextError } from './function_form_context_error';

// helper to check the state of the passed in expression type
function checkState(state) {
  return ({ context, expressionType }) => {
    const matchState = !context || context.state === state;
    return expressionType && expressionType.requiresContext && matchState;
  };
}

const ContextPending = ({ context, contextExpression, expressionType, updateContext }) => (
  <FunctionFormContextPending
    context={context}
    contextExpression={contextExpression}
    requiresContext={expressionType.requiresContext}
    updateContext={updateContext}
  />
);

const ContextError = ({ context }) => <FunctionFormContextError context={context} />;

const UnknownFunction = ({ argType }) => <FunctionUnknown argType={argType} />;

// alternate render paths based on expression state
const branches = [
  // if no expressionType was provided, render the ArgTypeUnknown component
  branch((props) => !props.argType, renderComponent(UnknownFunction)),
  // if the expressionType is in a pending state, render ArgTypeContextPending
  branch(checkState('pending'), renderComponent(ContextPending)),
  // if the expressionType is in an error state, render ArgTypeContextError
  branch(checkState('error'), renderComponent(ContextError)),
];

export const FunctionForm = compose(...branches)(FunctionFormComponent);

FunctionForm.propTypes = {
  context: PropTypes.object,
  expressionType: PropTypes.object,
};
