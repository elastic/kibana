/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { ESQuery } from '../../../common/typed_json';
import { Direction, GetKpiEventsQuery, KpiItem } from '../../graphql/types';
import { inputsModel } from '../../store';
import { createFilter, getDefaultFetchPolicy } from '../helpers';

import { kpiEventsQuery } from './index.gql_query';

export interface KpiEventsArgs {
  id: string;
  kpiEventType: KpiItem[];
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface OwnProps {
  children?: (args: KpiEventsArgs) => React.ReactNode;
  id?: string;
  filterQuery?: ESQuery | string;
  poll: number;
  sourceId: string;
  startDate: number;
  endDate: number;
}

export const KpiEventsQuery = pure<OwnProps>(
  ({ children, filterQuery, id = 'kpiEventsQuery', poll, sourceId, startDate, endDate }) => (
    <Query<GetKpiEventsQuery.Query, GetKpiEventsQuery.Variables>
      query={kpiEventsQuery}
      fetchPolicy={getDefaultFetchPolicy()}
      notifyOnNetworkStatusChange
      pollInterval={poll}
      variables={{
        filterQuery: createFilter(filterQuery),
        sourceId,
        pagination: {
          limit: 0,
          cursor: null,
          tiebreaker: null,
        },
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        sortField: {
          sortFieldId: 'timestamp',
          direction: Direction.desc,
        },
      }}
    >
      {({ data, loading, fetchMore, refetch }) => {
        const kpiEventType = getOr([], 'source.Events.kpiEventType', data);
        return children!({
          id,
          refetch,
          loading,
          kpiEventType,
        });
      }}
    </Query>
  )
);
