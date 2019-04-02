/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { GetKpiNetworkQuery, KpiNetworkData } from '../../graphql/types';
import { inputsModel } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplateProps } from '../query_template';

import { kpiNetworkQuery } from './index.gql_query';

export interface KpiNetworkArgs {
  id: string;
  kpiNetwork: KpiNetworkData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface KpiNetworkProps extends QueryTemplateProps {
  children: (args: KpiNetworkArgs) => React.ReactNode;
}

export const KpiNetworkQuery = pure<KpiNetworkProps>(
  ({ id = 'kpiNetworkQuery', children, filterQuery, sourceId, startDate, endDate }) => (
    <Query<GetKpiNetworkQuery.Query, GetKpiNetworkQuery.Variables>
      query={kpiNetworkQuery}
      fetchPolicy="cache-and-network"
      notifyOnNetworkStatusChange
      variables={{
        sourceId,
        timerange: {
          interval: '12h',
          from: startDate!,
          to: endDate!,
        },
        filterQuery: createFilter(filterQuery),
      }}
    >
      {({ data, loading, refetch }) => {
        const kpiNetwork = getOr({}, `source.KpiNetwork`, data);
        return children({
          id,
          kpiNetwork,
          loading,
          refetch,
        });
      }}
    </Query>
  )
);
