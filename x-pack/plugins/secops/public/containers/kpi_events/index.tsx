/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { Direction, GetKpiEventsQuery, KpiItem } from '../../graphql/types';
import { inputsModel } from '../../store';
import { kpiEventsQuery } from './index.gql_query';

export interface KpiEventsArgs {
  id: string;
  kpiEventType?: KpiItem[];
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface OwnProps {
  id?: string;
  children?: (args: KpiEventsArgs) => React.ReactNode;
  sourceId: string;
  startDate: number;
  endDate: number;
  filterQuery?: string;
  poll: number;
}

export const KpiEventsQuery = pure<OwnProps>(
  ({ id = 'kpiEventsQuery', children, filterQuery, sourceId, startDate, endDate, poll }) => (
    <Query<GetKpiEventsQuery.Query, GetKpiEventsQuery.Variables>
      query={kpiEventsQuery}
      fetchPolicy="cache-and-network"
      notifyOnNetworkStatusChange
      pollInterval={poll}
      variables={{
        filterQuery,
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
          direction: 'descending' as Direction,
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
