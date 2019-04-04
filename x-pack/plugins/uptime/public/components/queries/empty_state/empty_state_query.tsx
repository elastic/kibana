/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { formatUptimeGraphQLErrorList } from '../../../lib/helper/format_error_list';
import { UptimeCommonProps } from '../../../uptime_app';
import { EmptyState } from '../../functional/empty_state';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { getDocCountQuery } from './get_doc_count';

interface EmptyStateQueryResult {
  data?: {
    getDocCount: {
      count: number;
    };
  };
}

interface EmptyStateProps {
  basePath: string;
  children: JSX.Element[];
}

type Props = EmptyStateProps & UptimeCommonProps & UptimeGraphQLQueryProps<EmptyStateQueryResult>;

export const makeEmptyStateQuery = ({ basePath, children, data, errors, loading }: Props) => {
  const count = get(data, 'getDocCount.count', 0);
  return (
    <EmptyState
      basePath={basePath}
      count={count}
      error={formatUptimeGraphQLErrorList(errors || [])}
      loading={loading}
    >
      {children}
    </EmptyState>
  );
};

export const EmptyStateQuery = withUptimeGraphQL<EmptyStateQueryResult, EmptyStateProps>(
  makeEmptyStateQuery,
  getDocCountQuery
);
