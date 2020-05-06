/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent, ReactChildren } from 'react';
import { withState, withHandlers, lifecycle, mapProps, compose } from 'recompose';
import PropTypes from 'prop-types';
import { omit } from 'lodash';

type ResetErrorState = ({
  setError,
  setErrorInfo,
}: {
  setError: Function;
  setErrorInfo: Function;
}) => void;

interface Props {
  error: Error;
  errorInfo: any;
  resetErrorState: ResetErrorState;
}

interface ComponentProps extends Props {
  children: (props: Props) => ReactChildren;
}

const ErrorBoundaryComponent: FunctionComponent<ComponentProps> = props => (
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

interface HOCProps {
  setError: Function;
  setErrorInfo: Function;
}

interface HandlerProps {
  resetErrorState: ResetErrorState;
}

export const errorBoundaryHoc = compose<ComponentProps, {}>(
  withState('error', 'setError', null),
  withState('errorInfo', 'setErrorInfo', null),
  withHandlers<HOCProps, HandlerProps>({
    resetErrorState: ({ setError, setErrorInfo }) => () => {
      setError(null);
      setErrorInfo(null);
    },
  }),
  lifecycle<HOCProps, HOCProps>({
    componentDidCatch(error, errorInfo) {
      this.props.setError(error);
      this.props.setErrorInfo(errorInfo);
    },
  }),
  mapProps<HOCProps, Omit<HOCProps, 'setError' | 'setErrorInfo'>>(props =>
    omit(props, ['setError', 'setErrorInfo'])
  )
);

export const ErrorBoundary = errorBoundaryHoc(ErrorBoundaryComponent);
