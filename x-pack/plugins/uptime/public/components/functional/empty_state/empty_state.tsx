/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { formatUptimeGraphQLErrorList } from '../../../lib/helper/format_error_list';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { docCountQuery } from '../../../queries';
import { EmptyIndex } from './empty_index';
import { EmptyStateError } from './empty_state_error';
import { EmptyStateLoading } from './empty_state_loading';

interface EmptyStateQueryResult {
  getDocCount?: {
    count: number;
  };
}

interface EmptyStateProps {
  basePath: string;
  children: JSX.Element[] | JSX.Element;
}

type Props = UptimeGraphQLQueryProps<EmptyStateQueryResult> & EmptyStateProps;

export const EmptyStateComponent = ({ basePath, children, data, errors }: Props) => {
  if (errors) {
    return <EmptyStateError errorMessage={formatUptimeGraphQLErrorList(errors)} />;
  }
  if (data && data.getDocCount) {
    const { count } = data.getDocCount;
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
  }
  return <EmptyStateLoading />;
};

export const EmptyState = withUptimeGraphQL<EmptyStateQueryResult, EmptyStateProps>(
  EmptyStateComponent,
  docCountQuery
);
