/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';

import { FlowTarget } from '../../../server/graphql/types';
import { TlsEdges, TlsSortField, GetTlsQuery, PageInfo } from '../../graphql/types';
import { inputsModel, networkModel, networkSelectors, State } from '../../store';
import { createFilter } from '../helpers';
import { generateTablePaginationOptions } from '../../components/load_more_table/helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

import { tlsQuery } from './index.gql_query';

export interface TlsArgs {
  id: string;
  tls: TlsEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (newActivePage: number) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: TlsArgs) => React.ReactNode;
  flowTarget: FlowTarget;
  ip: string;
  type: networkModel.NetworkType;
}

export interface TlsComponentReduxProps {
  activePage: number;
  limit: number;
  tlsSortField: TlsSortField;
}

type TlsProps = OwnProps & TlsComponentReduxProps;

class TlsComponentQuery extends QueryTemplate<TlsProps, GetTlsQuery.Query, GetTlsQuery.Variables> {
  public render() {
    const {
      activePage,
      children,
      endDate,
      filterQuery,
      flowTarget,
      id = 'tlsQuery',
      ip,
      limit,
      sourceId,
      startDate,
      tlsSortField,
    } = this.props;
    return (
      <Query<GetTlsQuery.Query, GetTlsQuery.Variables>
        query={tlsQuery}
        fetchPolicy="cache-and-network"
        notifyOnNetworkStatusChange
        variables={{
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate ? startDate : 0,
            to: endDate ? endDate : Date.now(),
          },
          ip,
          flowTarget,
          sort: tlsSortField,
          pagination: generateTablePaginationOptions(activePage, limit),
          filterQuery: createFilter(filterQuery),
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const tls = getOr([], 'source.Tls.edges', data);
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
                  Tls: {
                    ...fetchMoreResult.source.Tls,
                    edges: [...fetchMoreResult.source.Tls.edges],
                  },
                },
              };
            },
          }));
          return children({
            id,
            refetch,
            loading,
            totalCount: getOr(0, 'source.Tls.totalCount', data),
            tls,
            pageInfo: getOr({}, 'source.Tls.pageInfo', data),
            loadMore: this.wrappedLoadMore,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getTlsSelector = networkSelectors.tlsSelector();
  const mapStateToProps = (state: State) => ({
    ...getTlsSelector(state),
  });

  return mapStateToProps;
};

export const TlsQuery = connect(makeMapStateToProps)(TlsComponentQuery);
