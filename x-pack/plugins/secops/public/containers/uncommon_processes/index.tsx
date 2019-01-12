/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, isEmpty, set } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { pure } from 'recompose';

import { GetUncommonProcessesQuery, PageInfo, UncommonProcessesEdges } from '../../graphql/types';

import { connect } from 'react-redux';
import { inputsModel, State } from '../../store';
import { uncommonProcessesSelector } from '../../store';
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

export interface OwnProps {
  id?: string;
  children: (args: UncommonProcessesArgs) => React.ReactNode;
  sourceId: string;
  startDate: number;
  endDate: number;
  filterQuery?: string;
  cursor: string | null;
  poll: number;
}

export interface UncommonProcessesComponentReduxProps {
  limit: number;
  upperLimit: number;
}

type UncommonProcessesProps = OwnProps & UncommonProcessesComponentReduxProps;

const UncommonProcessesComponentQuery = pure<UncommonProcessesProps>(
  ({
    id = 'uncommonProcessesQuery',
    children,
    filterQuery,
    sourceId,
    startDate,
    endDate,
    limit,
    upperLimit,
    cursor,
    poll,
  }) => (
    <Query<GetUncommonProcessesQuery.Query, GetUncommonProcessesQuery.Variables>
      query={uncommonProcessesQuery}
      fetchPolicy="cache-and-network"
      pollInterval={poll}
      notifyOnNetworkStatusChange
      variables={{
        sourceId,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        pagination: {
          limit: upperLimit,
          cursor,
          tiebreaker: null,
        },
        filterQuery,
      }}
    >
      {({ data, loading, refetch, updateQuery }) => {
        const uncommonProcesses = getOr([], 'source.UncommonProcesses.edges', data);
        const pageInfo = getOr(
          { endCursor: { value: '' } },
          'source.UncommonProcesses.pageInfo',
          data
        );

        let endCursor = String(limit);
        if (!isEmpty(pageInfo.endCursor.value)) {
          endCursor = pageInfo.endCursor.value;
        }

        const hasNextPage = hasMoreData(parseInt(endCursor, 10), upperLimit, uncommonProcesses);
        const slicedData = uncommonProcesses.slice(0, parseInt(endCursor, 10));
        return children({
          id,
          loading,
          refetch,
          totalCount: getOr(0, 'source.UncommonProcesses.totalCount', data),
          uncommonProcesses: slicedData,
          pageInfo: { hasNextPage, endCursor: { value: String(parseInt(endCursor, 10) + limit) } },
          loadMore: (newCursor: string) =>
            updateQuery(prev =>
              set('source.UncommonProcesses.pageInfo.endCursor.value', newCursor, prev)
            ),
        });
      }}
    </Query>
  )
);

export const hasMoreData = (
  limit: number,
  upperLimit: number,
  data: UncommonProcessesEdges[]
): boolean => limit < upperLimit && limit < data.length;

const mapStateToProps = (state: State) => uncommonProcessesSelector(state);

export const UncommonProcessesQuery = connect(mapStateToProps)(UncommonProcessesComponentQuery);
