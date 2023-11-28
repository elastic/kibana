/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiErrorBoundary } from '@elastic/eui';

interface ErrorBoundaryProps {
  children: JSX.Element;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  originalError?: Error;
}

/** @internal **/
const RecallError = ({ error }: { error: Error }) => {
  throw error;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state = {
    originalError: undefined,
  };

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { originalError: error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  static getDerivedStateFromProps() {
    return { originalError: undefined };
  }

  render() {
    return this.state?.originalError ? (
      <EuiErrorBoundary>
        <RecallError error={this.state.originalError} />
      </EuiErrorBoundary>
    ) : (
      this.props.children
    );
  }
}
