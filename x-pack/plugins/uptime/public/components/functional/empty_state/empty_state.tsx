/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EmptyIndex } from './empty_index';
import { EmptyStateError } from './empty_state_error';
import { EmptyStateLoading } from './empty_state_loading';

interface EmptyStateProps {
  basePath: string;
  children: JSX.Element[] | JSX.Element;
  count?: number;
  error?: string;
  loading?: boolean;
}

export const EmptyState = ({ basePath, children, count, error, loading }: EmptyStateProps) => {
  if (error) {
    return <EmptyStateError errorMessage={error} />;
  }
  /**
   * We choose to render the children any time the count > 0, even if
   * the component is loading. If we render the loading state for this component,
   * it will blow away the state of child components and trigger an ugly
   * jittery UX any time the components refresh. This way we'll keep the stale
   * state displayed during the fetching process.
   */
  if (count) {
    return <Fragment>{children}</Fragment>;
  }
  if (count === 0) {
    return <EmptyIndex basePath={basePath} />;
  }
  return <EmptyStateLoading />;
};
