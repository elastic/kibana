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
  children: JSX.Element[] | JSX.Element;
  count: number | undefined;
  error?: string;
  loading?: boolean;
}

export const EmptyState = ({ children, count, error, loading }: EmptyStateProps) => {
  if (error) {
    return <EmptyStateError errorMessage={error} />;
  }
  if (loading) {
    return <EmptyStateLoading />;
  } else if (!count) {
    return <EmptyIndex />;
  }
  return <Fragment>{children}</Fragment>;
};
