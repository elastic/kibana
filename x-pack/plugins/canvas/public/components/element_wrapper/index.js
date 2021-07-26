/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import usePrevious from 'react-use/lib/usePrevious';
import isEqual from 'react-fast-compare';
import { getResolvedArgs, getSelectedPage } from '../../state/selectors/workpad';
import { getState, getValue } from '../../lib/resolved_arg';
import { createDispatchedHandlerFactory } from '../../lib/create_handlers';
import { ElementWrapper as Component } from './element_wrapper';

const ElementWrapperComponent = ({ element, ...restProps }) => {
  const dispatch = useDispatch();

  const createHandlers = useMemo(() => createDispatchedHandlerFactory(dispatch), [dispatch]);

  const elementParams = useMemo(
    () => ({
      id: element.id,
      filter: element.filter,
      expression: element.expression,
    }),
    [element]
  );

  const [handlers, setHandlers] = useState(createHandlers(elementParams));
  const previousElementParams = usePrevious(elementParams);

  useEffect(() => {
    if (!isEqual(elementParams, previousElementParams)) {
      setHandlers(createHandlers(elementParams));
    }
  }, [createHandlers, elementParams, previousElementParams]);

  const { transformMatrix, width, height } = element;
  const resolvedArg = useSelector((state) =>
    getResolvedArgs(state, element.id, 'expressionRenderable')
  );

  // eslint-disable-next-line no-unused-vars
  const selectedPage = useSelector((state) => getSelectedPage(state));

  const state = getState(resolvedArg);
  const renderable = getValue(resolvedArg);

  return (
    <Component
      {...restProps}
      handlers={handlers}
      state={state}
      renderable={renderable}
      transformMatrix={transformMatrix}
      width={width}
      height={height}
    />
  );
};

export const ElementWrapper = memo(ElementWrapperComponent, (prevProps, props) =>
  isEqual(prevProps, props)
);

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
