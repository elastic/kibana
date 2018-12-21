/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getResolvedArgs, getSelectedPage, isWriteable } from '../../state/selectors/workpad';
import { getState, getValue, getError } from '../../lib/resolved_arg';
import { ElementWrapper as Component } from './element_wrapper';
import { createHandlers as createHandlersWithDispatch } from './lib/handlers';

const mapStateToProps = (state, { element }) => ({
  isWriteable: isWriteable(state),
  resolvedArg: getResolvedArgs(state, element.id, 'expressionRenderable'),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch, { element }) => ({
  createHandlers: pageId => () => createHandlersWithDispatch(element, pageId, dispatch),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { resolvedArg, selectedPage } = stateProps;
  const { element, restProps } = ownProps;
  const { id, transformMatrix, width, height } = element;

  return {
    ...restProps, // pass through unused props
    id, //pass through useful parts of the element object
    transformMatrix,
    width,
    height,
    state: getState(resolvedArg),
    error: getError(resolvedArg),
    renderable: getValue(resolvedArg),
    createHandlers: dispatchProps.createHandlers(selectedPage),
  };
};

export const ElementWrapper = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(Component);

ElementWrapper.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.string.isRequired,
    transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
};
