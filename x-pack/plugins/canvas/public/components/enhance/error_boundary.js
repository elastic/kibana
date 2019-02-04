/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { withState, withHandlers, lifecycle, mapProps, compose } from 'recompose';
import PropTypes from 'prop-types';
import { omit } from 'lodash';

export const errorBoundaryHoc = compose(
  withState('error', 'setError', null),
  withState('errorInfo', 'setErrorInfo', null),
  withHandlers({
    resetErrorState: ({ setError, setErrorInfo }) => () => {
      setError(null);
      setErrorInfo(null);
    },
  }),
  lifecycle({
    componentDidCatch(error, errorInfo) {
      this.props.setError(error);
      this.props.setErrorInfo(errorInfo);
    },
  }),
  mapProps(props => omit(props, ['setError', 'setErrorInfo']))
);

const ErrorBoundaryComponent = props => (
  <Fragment>
    {props.children({
      error: props.error,
      errorInfo: props.errorInfo,
      resetErrorState: props.resetErrorState,
    })}
  </Fragment>
);

ErrorBoundaryComponent.propTypes = {
  children: PropTypes.func.isRequired,
  error: PropTypes.object,
  errorInfo: PropTypes.object,
  resetErrorState: PropTypes.func.isRequired,
};

export const ErrorBoundary = errorBoundaryHoc(ErrorBoundaryComponent);
