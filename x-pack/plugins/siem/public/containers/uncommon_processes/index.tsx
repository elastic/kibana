/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';

import { GetUncommonProcessesQuery, PageInfo, UncommonProcessesEdges } from '../../graphql/types';
import { hostsModel, hostsSelectors, inputsModel, State } from '../../store';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

import { uncommonProcessesQuery } from './index.gql_query';

export interface UncommonProcessesArgs {
  id: string;
  uncommonProcesses: UncommonProcessesEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: UncommonProcessesArgs) => React.ReactNode;
  type: hostsModel.HostsType;
}

export interface UncommonProcessesComponentReduxProps {
  limit: number;
}

type UncommonProcessesProps = OwnProps & UncommonProcessesComponentReduxProps;

class UncommonProcessesComponentQuery extends QueryTemplate<
  UncommonProcessesProps,
  GetUncommonProcessesQuery.Query,
  GetUncommonProcessesQuery.Variables
> {
  public render() {
    const {
      id = 'uncommonProcessesQuery',
      children,
      filterQuery,
      sourceId,
      startDate,
      endDate,
      limit,
    } = this.props;
    return (
      <Query<GetUncommonProcessesQuery.Query, GetUncommonProcessesQuery.Variables>
        query={uncommonProcessesQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        variables={{
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
          pagination: {
            limit,
            cursor: null,
            tiebreaker: null,
          },
          filterQuery: createFilter(filterQuery),
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const uncommonProcesses = getOr([], 'source.UncommonProcesses.edges', data);
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
                  UncommonProcesses: {
                    ...fetchMoreResult.source.UncommonProcesses,
                    edges: [
                      ...prev.source.UncommonProcesses.edges,
                      ...fetchMoreResult.source.UncommonProcesses.edges,
                    ],
                  },
                },
              };
            },
          }));
          return children({
            id,
            loading,
            refetch,
            totalCount: getOr(0, 'source.UncommonProcesses.totalCount', data),
            uncommonProcesses,
            pageInfo: getOr({}, 'source.UncommonProcesses.pageInfo', data),
            loadMore: this.wrappedLoadMore,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getUncommonProcessesSelector = hostsSelectors.uncommonProcessesSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return getUncommonProcessesSelector(state, type);
  };
  return mapStateToProps;
};

export const UncommonProcessesQuery = connect(makeMapStateToProps)(UncommonProcessesComponentQuery);
