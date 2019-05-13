/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { GetOverviewNetworkQuery, OverviewNetworkData } from '../../../graphql/types';
import { inputsModel } from '../../../store/inputs';
import { createFilter } from '../../helpers';
import { QueryTemplateProps } from '../../query_template';

import { overviewNetworkQuery } from './index.gql_query';

export interface OverviewNetworkArgs {
  id: string;
  overviewNetwork: OverviewNetworkData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface OverviewNetworkProps extends QueryTemplateProps {
  children: (args: OverviewNetworkArgs) => React.ReactNode;
  sourceId: string;
  endDate: number;
  startDate: number;
}

export const OverviewNetworkQuery = pure<OverviewNetworkProps>(
  ({ id = 'overviewNetworkQuery', children, filterQuery, sourceId, startDate, endDate }) => (
    <Query<GetOverviewNetworkQuery.Query, GetOverviewNetworkQuery.Variables>
      query={overviewNetworkQuery}
      fetchPolicy="cache-and-network"
      notifyOnNetworkStatusChange
      variables={{
        sourceId,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        filterQuery: createFilter(filterQuery),
      }}
    >
      {({ data, loading, refetch }) => {
        const overviewNetwork = getOr({}, `source.OverviewNetwork`, data);
        return children({
          id,
          overviewNetwork,
          loading,
          refetch,
        });
      }}
    </Query>
  )
);
