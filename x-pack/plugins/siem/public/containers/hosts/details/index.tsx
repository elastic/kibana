/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';

import { GetHostDetailsQuery, HostItem } from '../../../graphql/types';
import { inputsModel } from '../../../store';
import { getDefaultFetchPolicy } from '../../helpers';
import { QueryTemplate, QueryTemplateProps } from '../../query_template';

import { HostDetailsQuery } from './host_details.gql_query';

export interface HostDetailsArgs {
  id: string;
  hostDetails: HostItem;
  loading: boolean;
  refetch: inputsModel.Refetch;
  startDate: number;
  endDate: number;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: HostDetailsArgs) => React.ReactNode;
  hostName: string;
  startDate: number;
  endDate: number;
}

export class HostDetailsByNameQuery extends QueryTemplate<
  OwnProps,
  GetHostDetailsQuery.Query,
  GetHostDetailsQuery.Variables
> {
  public render() {
    const {
      id = 'hostDetailsQuery',
      children,
      hostName,
      sourceId,
      startDate,
      endDate,
    } = this.props;
    return (
      <Query<GetHostDetailsQuery.Query, GetHostDetailsQuery.Variables>
        query={HostDetailsQuery}
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
        {({ data, loading, fetchMore, refetch }) => {
          const hostDetails = getOr([], 'source.HostDetails', data);
          return children({
            id,
            refetch,
            loading,
            hostDetails,
            startDate,
            endDate,
          });
        }}
      </Query>
    );
  }
}
