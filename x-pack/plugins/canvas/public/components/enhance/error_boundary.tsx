/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ErrorInfo, FC, ReactElement } from 'react';
import PropTypes from 'prop-types';

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

interface State {
  error: Error | undefined;
  errorInfo: ErrorInfo | undefined;
}

export class ErrorBoundary extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = { error: undefined, errorInfo: undefined };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
  }

  resetErrorState = () => {
    this.setState({ error: undefined, errorInfo: undefined });
  };

  render() {
    return React.cloneElement(this.props.children as ReactElement<ComponentProps>, {
      error: this.state.error,
      errorInfo: this.state.errorInfo,
      resetErrorState: this.resetErrorState,
    });
  }
}
