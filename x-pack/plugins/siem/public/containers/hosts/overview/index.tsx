/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { inputsModel } from '../../../store';
import { getDefaultFetchPolicy } from '../../helpers';
import { QueryTemplate, QueryTemplateProps } from '../../query_template';

import { HostOverviewQuery } from './host_overview.gql_query';
import { GetHostOverviewQuery, HostItem } from '../../../graphql/types';

export interface HostOverviewArgs {
  id: string;
  hostOverview: HostItem;
  loading: boolean;
  refetch: inputsModel.Refetch;
  startDate: number;
  endDate: number;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: HostOverviewArgs) => React.ReactNode;
  hostName: string;
  startDate: number;
  endDate: number;
}

export class HostOverviewByNameQuery extends QueryTemplate<
  OwnProps,
  GetHostOverviewQuery.Query,
  GetHostOverviewQuery.Variables
> {
  public render() {
    const {
      id = 'hostOverviewQuery',
      children,
      hostName,
      sourceId,
      startDate,
      endDate,
    } = this.props;
    return (
      <Query<GetHostOverviewQuery.Query, GetHostOverviewQuery.Variables>
        query={HostOverviewQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        variables={{
          sourceId,
          hostName,
          timerange: {
            interval: '12h',
            from: startDate,
            to: endDate,
          },
        }}
      >
        {({ data, loading, refetch }) => {
          const hostOverview = getOr([], 'source.HostOverview', data);
          return children({
            id,
            refetch,
            loading,
            hostOverview,
            startDate,
            endDate,
          });
        }}
      </Query>
    );
  }
}
