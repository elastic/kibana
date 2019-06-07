/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';

import chrome from 'ui/chrome';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import {
  GetNetworkDnsQuery,
  NetworkDnsEdges,
  NetworkDnsSortField,
  PageInfo,
} from '../../graphql/types';
import { inputsModel, networkModel, networkSelectors, State } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

import { networkDnsQuery } from './index.gql_query';

export interface NetworkDnsArgs {
  id: string;
  networkDns: NetworkDnsEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: NetworkDnsArgs) => React.ReactNode;
  type: networkModel.NetworkType;
}

export interface NetworkDnsComponentReduxProps {
  limit: number;
  dnsSortField: NetworkDnsSortField;
  isPtrIncluded: boolean;
}

type NetworkDnsProps = OwnProps & NetworkDnsComponentReduxProps;

class NetworkDnsComponentQuery extends QueryTemplate<
  NetworkDnsProps,
  GetNetworkDnsQuery.Query,
  GetNetworkDnsQuery.Variables
> {
  public render() {
    const {
      id = 'networkDnsQuery',
      children,
      dnsSortField,
      filterQuery,
      isPtrIncluded,
      sourceId,
      startDate,
      endDate,
      limit,
    } = this.props;
    return (
      <Query<GetNetworkDnsQuery.Query, GetNetworkDnsQuery.Variables>
        query={networkDnsQuery}
        fetchPolicy="cache-and-network"
        notifyOnNetworkStatusChange
        variables={{
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
          sort: dnsSortField,
          isPtrIncluded,
          pagination: {
            limit,
            cursor: null,
            tiebreaker: null,
          },
          filterQuery: createFilter(filterQuery),
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const networkDns = getOr([], `source.NetworkDns.edges`, data);
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
                  NetworkDns: {
                    ...fetchMoreResult.source.NetworkDns,
                    edges: [
                      ...prev.source.NetworkDns.edges,
                      ...fetchMoreResult.source.NetworkDns.edges,
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
            totalCount: getOr(0, 'source.NetworkDns.totalCount', data),
            networkDns,
            pageInfo: getOr({}, 'source.NetworkDns.pageInfo', data),
            loadMore: this.wrappedLoadMore,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getNetworkDnsSelector = networkSelectors.dnsSelector();
  const mapStateToProps = (state: State) => getNetworkDnsSelector(state);

  return mapStateToProps;
};

export const NetworkDnsQuery = connect(makeMapStateToProps)(NetworkDnsComponentQuery);
