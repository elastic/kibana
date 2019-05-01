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
  FlowDirection,
  FlowTarget,
  GetNetworkTopNFlowQuery,
  NetworkTopNFlowEdges,
  NetworkTopNFlowSortField,
  PageInfo,
} from '../../graphql/types';
import { inputsModel, networkModel, networkSelectors, State } from '../../store';
import { createFilter } from '../helpers';
import { generateTablePaginationOptions } from '../../components/load_more_table/helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

import { networkTopNFlowQuery } from './index.gql_query';

export interface NetworkTopNFlowArgs {
  id: string;
  networkTopNFlow: NetworkTopNFlowEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (newActivePage: number) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: NetworkTopNFlowArgs) => React.ReactNode;
  type: networkModel.NetworkType;
}

export interface NetworkTopNFlowComponentReduxProps {
  activePage: number;
  flowDirection: FlowDirection;
  flowTarget: FlowTarget;
  limit: number;
  topNFlowSort: NetworkTopNFlowSortField;
}

type NetworkTopNFlowProps = OwnProps & NetworkTopNFlowComponentReduxProps;

class NetworkTopNFlowComponentQuery extends QueryTemplate<
  NetworkTopNFlowProps,
  GetNetworkTopNFlowQuery.Query,
  GetNetworkTopNFlowQuery.Variables
> {
  public render() {
    const {
      activePage,
      children,
      endDate,
      filterQuery,
      flowDirection,
      flowTarget,
      id = 'networkTopNFlowQuery',
      limit,
      sourceId,
      startDate,
      topNFlowSort,
    } = this.props;
    return (
      <Query<GetNetworkTopNFlowQuery.Query, GetNetworkTopNFlowQuery.Variables>
        query={networkTopNFlowQuery}
        fetchPolicy="cache-and-network"
        notifyOnNetworkStatusChange
        variables={{
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
          sort: topNFlowSort,
          flowDirection,
          flowTarget,
          pagination: generateTablePaginationOptions(activePage, limit),
          filterQuery: createFilter(filterQuery),
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const networkTopNFlow = getOr([], `source.NetworkTopNFlow.edges`, data);
          this.setFetchMore(fetchMore);
          this.setFetchMoreOptions((newActivePage: number) => ({
            variables: {
              pagination: generateTablePaginationOptions(newActivePage, limit),
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
                      ...fetchMoreResult.source.NetworkTopNFlow.edges,
                    ],
                  },
                },
              };
            },
          }));
          return children({
            id,
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
  const getNetworkTopNFlowSelector = networkSelectors.topNFlowSelector();
  const mapStateToProps = (state: State) => getNetworkTopNFlowSelector(state);

  return mapStateToProps;
};

export const NetworkTopNFlowQuery = connect(makeMapStateToProps)(NetworkTopNFlowComponentQuery);
