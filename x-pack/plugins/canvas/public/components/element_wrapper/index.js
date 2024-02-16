/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import isEqual from 'react-fast-compare';
import { omit } from 'lodash/fp';
import { getResolvedArgs, getSelectedPage } from '../../state/selectors/workpad';
import { getState, getValue } from '../../lib/resolved_arg';
import { createDispatchedHandlerFactory } from '../../lib/create_handlers';
import { ElementWrapper as Component } from './element_wrapper';

const mapStateToProps = (state, ownProps) => {
  const { element } = ownProps;
  const resolvedArg = getResolvedArgs(state, element.id, 'expressionRenderable');
  const selectedPage = getSelectedPage(state);

  return {
    selectedPage,
    state: getState(resolvedArg),
    renderable: getValue(resolvedArg),
    transformMatrix: element.transformMatrix,
    width: element.width,
    height: element.height,
    element: {
      id: element.id,
      filter: element.filter,
      expression: element.expression,
    },
  };
};

const mapDispatchToProps = (dispatch) => {
  const createHandlers = createDispatchedHandlerFactory(dispatch);
  return (ownProps) => {
    const { element } = ownProps;
    return {
      handlers: createHandlers(element),
    };
  };
};

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { handlers } = dispatchProps;
  return {
    ...stateProps,
    ...omit('element', ownProps),
    handlers,
  };
};

const areStatesEqual = (next, prev) => isEqual(prev, next);
const areOwnPropsEqual = (next, prev) => isEqual(prev.element, next.element);
const areStatePropsEqual = (next, prev) => isEqual(prev, next);

export const ElementWrapper = connect(mapStateToProps, mapDispatchToProps, mergeProps, {
  areStatesEqual,
  areOwnPropsEqual,
  areStatePropsEqual,
})(Component);

ElementWrapper.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.string.isRequired,
    transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    // sometimes we get a shape, which lacks an expression
    // so element properties can not be marked as required
    expression: PropTypes.string,
    filter: PropTypes.string,
  }).isRequired,
};
