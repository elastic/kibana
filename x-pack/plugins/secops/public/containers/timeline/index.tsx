/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';

import memoizeOne from 'memoize-one';
import { Ecs, EcsEdges, GetTimelineQuery, PageInfo, SortField } from '../../graphql/types';
import { inputsModel } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';
import { timelineQuery } from './index.gql_query';

export interface TimelineArgs {
  events: Ecs[];
  id: string;
  loading: boolean;
  loadMore: (cursor: string, tieBreaker: string) => void;
  pageInfo: PageInfo;
  refetch: inputsModel.Refetch;
  totalCount: number;
  getUpdatedAt: () => number;
}

export interface OwnProps extends QueryTemplateProps {
  children?: (args: TimelineArgs) => React.ReactNode;
  limit: number;
  sortField: SortField;
}

export class TimelineQuery extends QueryTemplate<
  OwnProps,
  GetTimelineQuery.Query,
  GetTimelineQuery.Variables
> {
  private updatedDate: number = Date.now();
  private memoizedEvents: (events: EcsEdges[]) => Ecs[];

  constructor(props: OwnProps) {
    super(props);
    this.memoizedEvents = memoizeOne(this.getEcsEvent);
  }

  public render() {
    const {
      children,
      id = 'timelineQuery',
      limit,
      filterQuery,
      poll,
      sourceId,
      sortField,
    } = this.props;
    return (
      <Query<GetTimelineQuery.Query, GetTimelineQuery.Variables>
        query={timelineQuery}
        fetchPolicy="cache-and-network"
        notifyOnNetworkStatusChange
        pollInterval={poll}
        variables={{
          filterQuery: createFilter(filterQuery),
          sourceId,
          pagination: {
            limit,
            cursor: null,
            tiebreaker: null,
          },
          sortField,
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const eventEdges = getOr([], 'source.Events.edges', data);
          this.setFetchMore(fetchMore);
          this.setFetchMoreOptions((newCursor: string, tiebreaker?: string) => ({
            variables: {
              pagination: {
                cursor: newCursor,
                tiebreaker,
                limit,
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
                  Events: {
                    ...fetchMoreResult.source.Events,
                    edges: [...prev.source.Events.edges, ...fetchMoreResult.source.Events.edges],
                  },
                },
              };
            },
          }));
          this.updatedDate = Date.now();
          return children!({
            id,
            refetch,
            loading,
            totalCount: getOr(0, 'source.Events.totalCount', data),
            pageInfo: getOr({}, 'source.Events.pageInfo', data),
            events: this.memoizedEvents(eventEdges),
            loadMore: this.wrappedLoadMore,
            getUpdatedAt: this.getUpdatedAt,
          });
        }}
      </Query>
    );
  }

  private getUpdatedAt = () => this.updatedDate;

  private getEcsEvent = (eventEdges: EcsEdges[]): Ecs[] => eventEdges.map((e: EcsEdges) => e.node);
}
