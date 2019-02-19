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
  GetKpiNetworkQuery,
  KpiNetworkEdges,
  KpiNetworkType,
  PageInfo,
} from '../../graphql/types';
import { inputsModel, networkModel, networkSelectors, State } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';
import { kpiNetworkQuery } from './index.gql_query';

export interface KpiNetworkArgs {
  id: string;
  kpiNetwork: KpiNetworkEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: KpiNetworkArgs) => React.ReactNode;
  kpiNetworkType: KpiNetworkType;
  type: networkModel.NetworkType;
}

export interface KpiNetworkComponentReduxProps {
  limit: number;
}

type KpiNetworkProps = OwnProps & KpiNetworkComponentReduxProps;

class KpiNetworkComponentQuery extends QueryTemplate<
  KpiNetworkProps,
  GetKpiNetworkQuery.Query,
  GetKpiNetworkQuery.Variables
> {
  public render() {
    const {
      id = 'kpiNetworkQuery',
      children,
      filterQuery,
      kpiNetworkType,
      sourceId,
      startDate,
      endDate,
      limit,
      poll,
    } = this.props;
    return (
      <Query<GetKpiNetworkQuery.Query, GetKpiNetworkQuery.Variables>
        query={kpiNetworkQuery}
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
          type: kpiNetworkType,
          pagination: {
            limit,
            cursor: null,
            tiebreaker: null,
          },
          filterQuery: createFilter(filterQuery),
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const kpiNetwork = getOr([], `source.NetworkTopNFlow.edges`, data);
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
            id: `${id}${kpiNetworkType}`,
            refetch,
            loading,
            totalCount: getOr(0, 'source.NetworkTopNFlow.totalCount', data),
            kpiNetwork,
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
  const mapStateToProps = (state: State, { kpiNetworkType, type }: OwnProps) => {
    if (kpiNetworkType === KpiNetworkType.source) {
      return getNetworkTopSourceFlowSelector(state, type);
    } else if (kpiNetworkType === KpiNetworkType.destination) {
      return getNetworkTopDestinationFlowSelector(state, type);
    }
  };
  return mapStateToProps;
};

export const KpiNetworkQuery = connect(makeMapStateToProps)(KpiNetworkComponentQuery);
