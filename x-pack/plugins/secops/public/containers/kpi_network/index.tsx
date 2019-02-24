/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';

import { GetKpiNetworkQuery, KpiNetworkData } from '../../graphql/types';
import { createFilter } from '../helpers';
import { QueryTemplateProps } from '../query_template';
import { kpiNetworkQuery } from './index.gql_query';

export interface KpiNetworkArgs {
  id: string;
  kpiNetwork: KpiNetworkData;
  loading: boolean;
}

export interface KpiNetworkProps extends QueryTemplateProps {
  children: (args: KpiNetworkArgs) => React.ReactNode;
}

export class KpiNetworkQuery extends React.PureComponent<KpiNetworkProps> {
  public render() {
    const {
      id = 'kpiNetworkQuery',
      children,
      filterQuery,
      sourceId,
      startDate,
      endDate,
    } = this.props;

    return (
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
        {({ data, loading }) => {
          const kpiNetwork = getOr(0, `source.KpiNetwork`, data);
          return children({
            id,
            loading,
            kpiNetwork,
          });
        }}
      </Query>
    );
  }
}
