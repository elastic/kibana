/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';

import {
  GetNetworkTopNFlowQuery,
  NetworkTopNFlowEdges,
  NetworkTopNFlowType,
  PageInfo,
} from '../../graphql/types';
import { inputsModel, networkModel, networkSelectors, State } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';
import { networkTopNFlowQuery } from './index.gql_query';

export interface NetworkTopNFlowArgs {
  id: string;
  networkTopNFlow: NetworkTopNFlowEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: NetworkTopNFlowArgs) => React.ReactNode;
  networkTopNFlowType: NetworkTopNFlowType;
  type: networkModel.NetworkType;
}

export interface NetworkTopNFlowComponentReduxProps {
  limit: number;
}

type NetworkTopNFlowProps = OwnProps & NetworkTopNFlowComponentReduxProps;

class NetworkTopNFlowComponentQuery extends QueryTemplate<
  NetworkTopNFlowProps,
  GetNetworkTopNFlowQuery.Query,
  GetNetworkTopNFlowQuery.Variables
> {
  public render() {
    const {
      id = 'networkTopNFlowQuery',
      children,
      filterQuery,
      networkTopNFlowType,
      sourceId,
      startDate,
      endDate,
      limit,
      poll,
    } = this.props;
    return (
      <Query<GetNetworkTopNFlowQuery.Query, GetNetworkTopNFlowQuery.Variables>
        query={networkTopNFlowQuery}
        fetchPolicy="cache-and-network"
        pollInterval={poll}
        notifyOnNetworkStatusChange
        variables={{
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
          type: networkTopNFlowType,
          pagination: {
            limit,
            cursor: null,
            tiebreaker: null,
          },
          filterQuery: createFilter(filterQuery),
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const networkTopNFlow = getOr([], `source.NetworkTopNFlow.edges`, data);
          this.setFetchMore(fetchMore);
          this.setFetchMoreOptions((newCursor: string) => ({
            variables: {
              pagination: {
                cursor: newCursor,
                limit: limit + parseInt(newCursor, 10),
              },
            },
            updateQuery: (prev, { fetchMoreResult }) => {
              if (!fetchMoreResult) {
                return prev;
              }
              return {
                ...fetchMoreResult,
                source: {
                  ...fetchMoreResult.source,
                  NetworkTopNFlow: {
                    ...fetchMoreResult.source.NetworkTopNFlow,
                    edges: [
                      ...prev.source.NetworkTopNFlow.edges,
                      ...fetchMoreResult.source.NetworkTopNFlow.edges,
                    ],
                  },
                },
              };
            },
          }));
          return children({
            id: `${id}${networkTopNFlowType}`,
            refetch,
            loading,
            totalCount: getOr(0, 'source.NetworkTopNFlow.totalCount', data),
            networkTopNFlow,
            pageInfo: getOr({}, 'source.NetworkTopNFlow.pageInfo', data),
            loadMore: this.wrappedLoadMore,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getNetworkTopDestinationFlowSelector = networkSelectors.topDestinationSelector();
  const getNetworkTopSourceFlowSelector = networkSelectors.topSourceSelector();
  const mapStateToProps = (state: State, { networkTopNFlowType, type }: OwnProps) => {
    if (networkTopNFlowType === NetworkTopNFlowType.source) {
      return getNetworkTopSourceFlowSelector(state, type);
    } else if (networkTopNFlowType === NetworkTopNFlowType.destination) {
      return getNetworkTopDestinationFlowSelector(state, type);
    }
  };
  return mapStateToProps;
};

export const NetworkTopNFlowQuery = connect(makeMapStateToProps)(NetworkTopNFlowComponentQuery);
