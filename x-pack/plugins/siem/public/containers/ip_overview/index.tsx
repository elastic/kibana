/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { GetIpOverviewQuery, IpOverviewData } from '../../graphql/types';
import { networkModel } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplateProps } from '../query_template';

import { ipOverviewQuery } from './index.gql_query';

export interface IpOverviewArgs {
  id: string;
  ipOverviewData: IpOverviewData;
  loading: boolean;
}

export interface IpOverviewProps extends QueryTemplateProps {
  children: (args: IpOverviewArgs) => React.ReactNode;
  type: networkModel.NetworkType;
  ip: string;
}

export const IpOverviewQuery = pure<IpOverviewProps>(
  ({ id = 'ipOverviewQuery', children, filterQuery, sourceId, ip }) => (
    <Query<GetIpOverviewQuery.Query, GetIpOverviewQuery.Variables>
      query={ipOverviewQuery}
      fetchPolicy="cache-and-network"
      notifyOnNetworkStatusChange
      variables={{
        sourceId,
        filterQuery: createFilter(filterQuery),
        ip,
      }}
    >
      {({ data, loading }) => {
        const init: IpOverviewData = {};
        const ipOverviewData: IpOverviewData = getOr(init, 'source.IpOverview', data);
        return children({
          id,
          ipOverviewData,
          loading,
        });
      }}
    </Query>
  )
);
