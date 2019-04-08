/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose, shouldUpdate } from 'recompose';
import isEqual from 'react-fast-compare';
import { getResolvedArgs, getSelectedPage } from '../../state/selectors/workpad';
import { getState, getValue, getError } from '../../lib/resolved_arg';
import { ElementWrapper as Component } from './element_wrapper';
import { createHandlers as createHandlersWithDispatch } from './lib/handlers';

const mapStateToProps = (state, { element }) => ({
  resolvedArg: getResolvedArgs(state, element.id, 'expressionRenderable'),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch, { element }) => ({
  createHandlers: pageId => createHandlersWithDispatch(element, pageId, dispatch),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { resolvedArg, selectedPage } = stateProps;
  const { element, restProps } = ownProps;
  const { id, transformMatrix, width, height } = element;

  return {
    selectedPage,
    ...restProps, // pass through unused props
    id, //pass through useful parts of the element object
    transformMatrix,
    width,
    height,
    state: getState(resolvedArg),
    error: getError(resolvedArg),
    renderable: getValue(resolvedArg),
    createHandlers: dispatchProps.createHandlers,
  };
};

export const ElementWrapper = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    {
      areOwnPropsEqual: isEqual,
    }
  ),
  shouldUpdate((props, nextProps) => !isEqual(props, nextProps))
)(Component);

ElementWrapper.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.string.isRequired,
    transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
};
