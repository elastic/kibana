/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { connectAdvanced } from 'react-redux';
import { compose, withPropsOnChange, mapProps } from 'recompose';
import isEqual from 'react-fast-compare';
import { getResolvedArgs, getSelectedPage } from '../../state/selectors/workpad';
import { getState, getValue } from '../../lib/resolved_arg';
import { createDispatchedHandlerFactory } from '../../lib/create_handlers';
import { ElementWrapper as Component } from './element_wrapper';

function selectorFactory(dispatch) {
  let result = {};
  const createHandlers = createDispatchedHandlerFactory(dispatch);

  return (nextState, nextOwnProps) => {
    const { element, ...restOwnProps } = nextOwnProps;
    const { transformMatrix, width, height } = element;

    const resolvedArg = getResolvedArgs(nextState, element.id, 'expressionRenderable');
    const selectedPage = getSelectedPage(nextState);

    // build interim props object
    const nextResult = {
      ...restOwnProps,
      // state and state-derived props
      selectedPage,
      state: getState(resolvedArg),
      renderable: getValue(resolvedArg),
      // pass along the handlers creation function
      createHandlers,
      // required parts of the element object
      transformMatrix,
      width,
      height,
      // pass along only the useful parts of the element object
      // so handlers object can be created
      element: {
        id: element.id,
        filter: element.filter,
        expression: element.expression,
      },
    };

    // update props only if something actually changed
    if (!isEqual(result, nextResult)) {
      result = nextResult;
    }

    return result;
  };
}

export const ElementWrapper = compose(
  connectAdvanced(selectorFactory),
  withPropsOnChange(
    (props, nextProps) => !isEqual(props.element, nextProps.element),
    (props) => {
      const { element, createHandlers } = props;
      const handlers = createHandlers(element);
      // this removes element and createHandlers from passed props
      return { handlers };
    }
  ),
  mapProps((props) => {
    // remove element and createHandlers from props passed to component
    // eslint-disable-next-line no-unused-vars
    const { element, createHandlers, selectedPage, ...restProps } = props;
    return restProps;
  })
)(Component);

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
