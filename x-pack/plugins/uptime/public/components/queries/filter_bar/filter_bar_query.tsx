/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FilterBar as FilterBarType } from '../../../../common/graphql/types';
import { UptimeSearchBarQueryChangeHandler } from '../../../pages/overview';
import { UptimeCommonProps } from '../../../uptime_app';
import { FilterBar, FilterBarLoading } from '../../functional';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { getFilterBarQuery } from './get_filter_bar';

interface FilterBarQueryResult {
  filterBar?: FilterBarType;
}

interface FilterBarProps {
  currentQuery?: object;
  updateQuery: UptimeSearchBarQueryChangeHandler;
}

type Props = FilterBarProps & UptimeCommonProps & UptimeGraphQLQueryProps<FilterBarQueryResult>;

export const makeFilterBarQuery = ({ currentQuery, data, updateQuery }: Props) => {
  if (data && data.filterBar) {
    return (
      <FilterBar currentQuery={currentQuery} filterBar={data.filterBar} updateQuery={updateQuery} />
    );
  }
  return <FilterBarLoading />;
};

export const FilterBarQuery = withUptimeGraphQL<FilterBarQueryResult, FilterBarProps>(
  makeFilterBarQuery,
  getFilterBarQuery
);
