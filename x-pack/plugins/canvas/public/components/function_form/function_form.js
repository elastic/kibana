/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

// alternate render paths based on expression state
const branches = [
  // if no expressionType was provided, render the ArgTypeUnknown component
  branch((props) => !props.expressionType, renderComponent(FunctionUnknown)),
  // if the expressionType is in a pending state, render ArgTypeContextPending
  branch(checkState('pending'), renderComponent(FunctionFormContextPending)),
  // if the expressionType is in an error state, render ArgTypeContextError
  branch(checkState('error'), renderComponent(FunctionFormContextError)),
];

export const FunctionForm = compose(...branches)(FunctionFormComponent);

FunctionForm.propTypes = {
  context: PropTypes.object,
  expressionType: PropTypes.object,
};
