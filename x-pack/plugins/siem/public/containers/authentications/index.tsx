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
import { AuthenticationsEdges, GetAuthenticationsQuery, PageInfo } from '../../graphql/types';
import { hostsModel, hostsSelectors, inputsModel, State } from '../../store';
import { createFilter, getDefaultFetchPolicy } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

import { authenticationsQuery } from './index.gql_query';

export interface AuthenticationArgs {
  id: string;
  authentications: AuthenticationsEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: AuthenticationArgs) => React.ReactNode;
  type: hostsModel.HostsType;
}

export interface AuthenticationsComponentReduxProps {
  limit: number;
}

type AuthenticationsProps = OwnProps & AuthenticationsComponentReduxProps;

class AuthenticationsComponentQuery extends QueryTemplate<
  AuthenticationsProps,
  GetAuthenticationsQuery.Query,
  GetAuthenticationsQuery.Variables
> {
  public render() {
    const {
      id = 'authenticationQuery',
      children,
      filterQuery,
      sourceId,
      startDate,
      endDate,
      limit,
    } = this.props;
    return (
      <Query<GetAuthenticationsQuery.Query, GetAuthenticationsQuery.Variables>
        query={authenticationsQuery}
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
          defaultIndex: chrome.getUiSettingsClient().get(DEFAULT_INDEX_KEY),
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const authentications = getOr([], 'source.Authentications.edges', data);
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
                  Authentications: {
                    ...fetchMoreResult.source.Authentications,
                    edges: [
                      ...prev.source.Authentications.edges,
                      ...fetchMoreResult.source.Authentications.edges,
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
            totalCount: getOr(0, 'source.Authentications.totalCount', data),
            authentications,
            pageInfo: getOr({}, 'source.Authentications.pageInfo', data),
            loadMore: this.wrappedLoadMore,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getAuthenticationsSelector = hostsSelectors.authenticationsSelector();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return getAuthenticationsSelector(state, type);
  };
  return mapStateToProps;
};

export const AuthenticationsQuery = connect(makeMapStateToProps)(AuthenticationsComponentQuery);
