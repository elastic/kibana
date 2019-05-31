/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, get } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import chrome from 'ui/chrome';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { GetKpiNetworkQuery, KpiNetworkData } from '../../graphql/types';
import { inputsModel } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplateProps } from '../query_template';

import { kpiNetworkQuery } from './index.gql_query';
import { ChartData } from '../../components/charts/common';

export interface KpiNetworkArgs {
  id: string;
  kpiNetwork: KpiNetworkData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface KpiNetworkProps extends QueryTemplateProps {
  children: (args: KpiNetworkArgs) => React.ReactNode;
}

const formatHistogramData = (
  data: Array<{
    key_as_string: string;
    doc_count: number;
    count: { value: number };
  }>
): ChartData[] => {
  if (!Array.isArray(data)) return [];
  return data.map(d => ({
    x: getOr(null, 'key_as_string', d),
    y: getOr(null, 'count.value', d) || getOr(null, 'doc_count', d),
  }));
};

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
        defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
      }}
    >
      {({ data, loading, refetch }) => {
        const kpiNetwork = getOr({}, `source.KpiNetwork`, data);
        const uniqueSourcePrivateIpsHistogram = get('uniqueSourcePrivateIpsHistogram', kpiNetwork);
        const uniqueDestinationPrivateIpsHistogram = get(
          'uniqueDestinationPrivateIpsHistogram',
          kpiNetwork
        );
        return children({
          id,
          kpiNetwork: {
            ...kpiNetwork,
            uniqueSourcePrivateIpsHistogram: uniqueSourcePrivateIpsHistogram
              ? formatHistogramData(uniqueSourcePrivateIpsHistogram)
              : [],
            uniqueDestinationPrivateIpsHistogram: uniqueDestinationPrivateIpsHistogram
              ? formatHistogramData(uniqueDestinationPrivateIpsHistogram)
              : [],
          },
          loading,
          refetch,
        });
      }}
    </Query>
  )
);
