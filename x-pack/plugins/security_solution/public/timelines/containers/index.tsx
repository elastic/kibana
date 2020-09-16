/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, uniqBy } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React from 'react';
import { Query } from 'react-apollo';
import { compose, Dispatch } from 'redux';
import { connect, ConnectedProps } from 'react-redux';

import {
  GetTimelineQuery,
  PageInfo,
  SortField,
  TimelineEdges,
  TimelineItem,
} from '../../graphql/types';
import { inputsModel, inputsSelectors, State } from '../../common/store';
import { withKibana, WithKibanaProps } from '../../common/lib/kibana';
import { createFilter } from '../../common/containers/helpers';
import { QueryTemplate, QueryTemplateProps } from '../../common/containers/query_template';
import { timelineQuery } from './index.gql_query';
import { timelineActions } from '../../timelines/store/timeline';
import { detectionsTimelineIds, skipQueryForDetectionsPage } from './helpers';

export interface TimelineArgs {
  events: TimelineItem[];
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  loadMore: (cursor: string, tieBreaker: string) => void;
  pageInfo: PageInfo;
  refetch: inputsModel.Refetch;
  totalCount: number;
  getUpdatedAt: () => number;
}

export interface CustomReduxProps {
  clearSignalsState: ({ id }: { id?: string }) => void;
}

export interface OwnProps extends QueryTemplateProps {
  children?: (args: TimelineArgs) => React.ReactNode;
  endDate: string;
  id: string;
  limit: number;
  sortField: SortField;
  fields: string[];
  sourcererIndexPatterns?: string[];
  startDate: string;
  queryDeduplication: string;
}

type TimelineQueryProps = OwnProps & PropsFromRedux & WithKibanaProps & CustomReduxProps;

class TimelineQueryComponent extends QueryTemplate<
  TimelineQueryProps,
  GetTimelineQuery.Query,
  GetTimelineQuery.Variables
> {
  private updatedDate: number = Date.now();
  private memoizedTimelineEvents: (variables: string, events: TimelineEdges[]) => TimelineItem[];

  constructor(props: TimelineQueryProps) {
    super(props);
    this.memoizedTimelineEvents = memoizeOne(this.getTimelineEvents);
  }

  public render() {
    const {
      children,
      clearSignalsState,
      docValueFields,
      endDate,
      id,
      indexNames,
      isInspected,
      limit,
      fields,
      filterQuery,
      sourceId,
      sortField,
      startDate,
      queryDeduplication,
    } = this.props;
    // Fun fact: When using this hook multiple times within a component (e.g. add_exception_modal & edit_exception_modal),
    // the apolloClient will perform queryDeduplication and prevent the first query from executing. A deep compare is not
    // performed on `indices`, so another field must be passed to circumvent this.
    // For details, see https://github.com/apollographql/react-apollo/issues/2202
    const variables: GetTimelineQuery.Variables & { queryDeduplication: string } = {
      fieldRequested: fields,
      filterQuery: createFilter(filterQuery),
      sourceId,
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
      pagination: { limit, cursor: null, tiebreaker: null },
      sortField,
      defaultIndex: indexNames,
      docValueFields: docValueFields ?? [],
      inspect: isInspected,
      queryDeduplication,
    };

    return (
      <Query<GetTimelineQuery.Query, GetTimelineQuery.Variables>
        query={timelineQuery}
        fetchPolicy="network-only"
        notifyOnNetworkStatusChange
        skip={skipQueryForDetectionsPage(id, indexNames)}
        variables={variables}
      >
        {({ data, loading, fetchMore, refetch }) => {
          this.setRefetch(refetch);
          this.setExecuteBeforeRefetch(clearSignalsState);
          this.setExecuteBeforeFetchMore(clearSignalsState);

          const timelineEdges = getOr([], 'source.Timeline.edges', data);
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
                  Timeline: {
                    ...fetchMoreResult.source.Timeline,
                    edges: uniqBy('node._id', [
                      ...prev.source.Timeline.edges,
                      ...fetchMoreResult.source.Timeline.edges,
                    ]),
                  },
                },
              };
            },
          }));
          this.updatedDate = Date.now();
          return children!({
            id,
            inspect: getOr(null, 'source.Timeline.inspect', data),
            refetch: this.wrappedRefetch,
            loading,
            totalCount: getOr(0, 'source.Timeline.totalCount', data),
            pageInfo: getOr({}, 'source.Timeline.pageInfo', data),
            events: this.memoizedTimelineEvents(JSON.stringify(variables), timelineEdges),
            loadMore: this.wrappedLoadMore,
            getUpdatedAt: this.getUpdatedAt,
          });
        }}
      </Query>
    );
  }

  private getUpdatedAt = () => this.updatedDate;

  private getTimelineEvents = (variables: string, timelineEdges: TimelineEdges[]): TimelineItem[] =>
    timelineEdges.map((e: TimelineEdges) => e.node);
}

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.timelineQueryByIdSelector();
  const mapStateToProps = (state: State, { id }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  clearSignalsState: ({ id }: { id?: string }) => {
    if (id != null && detectionsTimelineIds.some((timelineId) => timelineId === id)) {
      dispatch(timelineActions.clearEventsLoading({ id }));
      dispatch(timelineActions.clearEventsDeleted({ id }));
    }
  },
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const TimelineQuery = compose<React.ComponentClass<OwnProps>>(
  connector,
  withKibana
)(TimelineQueryComponent);
