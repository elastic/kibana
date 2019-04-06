/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { GetKpiHostsQuery, KpiHostsData } from '../../graphql/types';
import { inputsModel } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplateProps } from '../query_template';

import { kpiHostsQuery } from './index.gql_query';

export interface KpiHostsArgs {
  id: string;
  kpiHosts: KpiHostsData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface KpiHostsProps extends QueryTemplateProps {
  children: (args: KpiHostsArgs) => React.ReactNode;
}

export const KpiHostsQuery = pure<KpiHostsProps>(
  ({ id = 'kpiHostsQuery', children, filterQuery, sourceId, startDate, endDate }) => (
    <Query<GetKpiHostsQuery.Query, GetKpiHostsQuery.Variables>
      query={kpiHostsQuery}
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
        const kpiHosts = getOr({}, `source.KpiHosts`, data);
        return children({
          id,
          kpiHosts,
          loading,
          refetch,
        });
      }}
    </Query>
  )
);
