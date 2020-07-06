/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ErrorInfo, FC, ReactElement } from 'react';
import { withState, withHandlers, lifecycle, mapProps, compose } from 'recompose';
import PropTypes from 'prop-types';
import { omit } from 'lodash';

interface Props {
  error?: Error;
  errorInfo?: ErrorInfo;
  resetErrorState: (state: { error: Error; errorInfo: ErrorInfo }) => void;
  setError: (error: Error | null) => void;
  setErrorInfo: (info: ErrorInfo | null) => void;
  children: (props: ChildrenProps) => ReactElement | null;
}

type ComponentProps = Pick<Props, 'children' | 'errorInfo' | 'resetErrorState' | 'error'>;
type ChildrenProps = Omit<ComponentProps, 'children'>;

const ErrorBoundaryComponent: FC<ComponentProps> = (props) => {
  const { children, ...rest } = props;
  return <>{children(rest)}</>;
};

ErrorBoundaryComponent.propTypes = {
  children: PropTypes.func.isRequired,
  error: PropTypes.object,
  errorInfo: PropTypes.object,
  resetErrorState: PropTypes.func.isRequired,
};

export const errorBoundaryHoc = compose<ComponentProps, Pick<ComponentProps, 'children'>>(
  withState('error', 'setError', null),
  withState('errorInfo', 'setErrorInfo', null),
  withHandlers<Pick<Props, 'setError' | 'setErrorInfo'>, Pick<Props, 'resetErrorState'>>({
    resetErrorState: ({ setError, setErrorInfo }) => () => {
      setError(null);
      setErrorInfo(null);
    },
  }),
  lifecycle<Props, Props>({
    componentDidCatch(error, errorInfo) {
      this.props.setError(error);
      this.props.setErrorInfo(errorInfo);
    },
  }),
  mapProps<ComponentProps, Props>((props) => omit(props, ['setError', 'setErrorInfo']))
);

export const ErrorBoundary = errorBoundaryHoc(ErrorBoundaryComponent);
