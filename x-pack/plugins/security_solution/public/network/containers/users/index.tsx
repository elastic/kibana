/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect, ConnectedProps } from 'react-redux';
import { compose } from 'redux';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { GetUsersQuery, FlowTarget, PageInfoPaginated, UsersEdges } from '../../../graphql/types';
import { inputsModel, State, inputsSelectors } from '../../../common/store';
import { withKibana, WithKibanaProps } from '../../../common/lib/kibana';
import { createFilter, getDefaultFetchPolicy } from '../../../common/containers/helpers';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import {
  QueryTemplatePaginated,
  QueryTemplatePaginatedProps,
} from '../../../common/containers/query_template_paginated';
import { networkModel, networkSelectors } from '../../store';

import { usersQuery } from './index.gql_query';

const ID = 'usersQuery';

export interface UsersArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
  users: UsersEdges[];
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: UsersArgs) => React.ReactNode;
  flowTarget: FlowTarget;
  ip: string;
  type: networkModel.NetworkType;
}

type UsersProps = OwnProps & PropsFromRedux & WithKibanaProps;

class UsersComponentQuery extends QueryTemplatePaginated<
  UsersProps,
  GetUsersQuery.Query,
  GetUsersQuery.Variables
> {
  public render() {
    const {
      activePage,
      children,
      endDate,
      filterQuery,
      flowTarget,
      id = ID,
      ip,
      isInspected,
      kibana,
      limit,
      skip,
      sourceId,
      startDate,
      sort,
    } = this.props;
    const variables: GetUsersQuery.Variables = {
      defaultIndex: kibana.services.uiSettings.get<string[]>(DEFAULT_INDEX_KEY),
      filterQuery: createFilter(filterQuery),
      flowTarget,
      inspect: isInspected,
      ip,
      pagination: generateTablePaginationOptions(activePage, limit),
      sort,
      sourceId,
      timerange: {
        interval: '12h',
        from: startDate!,
        to: endDate!,
      },
    };
    return (
      <Query<GetUsersQuery.Query, GetUsersQuery.Variables>
        query={usersQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        skip={skip}
        variables={variables}
      >
        {({ data, loading, fetchMore, networkStatus, refetch }) => {
          const users = getOr([], `source.Users.edges`, data);
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
                  Users: {
                    ...fetchMoreResult.source.Users,
                    edges: [...fetchMoreResult.source.Users.edges],
                  },
                },
              };
            },
          }));
          const isLoading = this.isItAValidLoading(loading, variables, networkStatus);
          return children({
            id,
            inspect: getOr(null, 'source.Users.inspect', data),
            isInspected,
            loading: isLoading,
            loadPage: this.wrappedLoadMore,
            pageInfo: getOr({}, 'source.Users.pageInfo', data),
            refetch: this.memoizedRefetchQuery(variables, limit, refetch),
            totalCount: getOr(-1, 'source.Users.totalCount', data),
            users,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getUsersSelector = networkSelectors.usersSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getUsersSelector(state),
      isInspected,
    };
  };

  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const UsersQuery = compose<React.ComponentClass<OwnProps>>(
  connector,
  withKibana
)(UsersComponentQuery);
