/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, get } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { GetKpiHostsQuery, KpiHostsData } from '../../graphql/types';
import { inputsModel } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplateProps } from '../query_template';

import { kpiHostsQuery } from './index.gql_query';
import { ChartData } from '../../components/stat_items';

export interface KpiHostsArgs {
  id: string;
  kpiHosts: KpiHostsData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface KpiHostsProps extends QueryTemplateProps {
  children: (args: KpiHostsArgs) => React.ReactNode;
}

const formatHistogramData = (
  data: Array<{
    x: number;
    y: { value: number; doc_count: number };
  }>
): ChartData[] => {
  return data.map(({ x, y }) => ({
    x,
    y: y.value || y.doc_count,
  }));
};

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
        const hostsHistogram = get(`hostsHistogram`, kpiHosts);
        const authFailureHistogram = get(`authFailureHistogram`, kpiHosts);
        const authSuccessHistogram = get(`authSuccessHistogram`, kpiHosts);
        const uniqueSourceIpsHistogram = get(`uniqueSourceIpsHistogram`, kpiHosts);
        const uniqueDestinationIpsHistogram = get(`uniqueDestinationIpsHistogram`, kpiHosts);
        return children({
          id,
          kpiHosts: {
            ...kpiHosts,
            hostsHistogram: hostsHistogram ? formatHistogramData(hostsHistogram) : [],
            authFailureHistogram: authFailureHistogram
              ? formatHistogramData(authFailureHistogram)
              : [],
            authSuccessHistogram: authSuccessHistogram
              ? formatHistogramData(authSuccessHistogram)
              : [],
            uniqueSourceIpsHistogram: uniqueSourceIpsHistogram
              ? formatHistogramData(uniqueSourceIpsHistogram)
              : [],
            uniqueDestinationIpsHistogram: uniqueDestinationIpsHistogram
              ? formatHistogramData(uniqueDestinationIpsHistogram)
              : [],
          },
          loading,
          refetch,
        });
      }}
    </Query>
  )
);
