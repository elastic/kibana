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

import { TimelineId } from '../../../common/types/timeline';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { IIndexPattern } from '../../../../../../src/plugins/data/common/index_patterns';
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
import { EventType } from '../../timelines/store/timeline/model';
import { timelineQuery } from './index.gql_query';
import { timelineActions } from '../../timelines/store/timeline';

const timelineIds = [TimelineId.detectionsPage, TimelineId.detectionsRulesDetailsPage];

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
  eventType?: EventType;
  id: string;
  indexPattern?: IIndexPattern;
  indexToAdd?: string[];
  limit: number;
  sortField: SortField;
  fields: string[];
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
      eventType = 'raw',
      id,
      indexPattern,
      indexToAdd = [],
      isInspected,
      kibana,
      limit,
      fields,
      filterQuery,
      sourceId,
      sortField,
    } = this.props;
    const defaultKibanaIndex = kibana.services.uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
    const defaultIndex =
      indexPattern == null || (indexPattern != null && indexPattern.title === '')
        ? [
            ...(['all', 'raw'].includes(eventType) ? defaultKibanaIndex : []),
            ...(['all', 'alert', 'signal'].includes(eventType) ? indexToAdd : []),
          ]
        : indexPattern?.title.split(',') ?? [];
    const variables: GetTimelineQuery.Variables = {
      fieldRequested: fields,
      filterQuery: createFilter(filterQuery),
      sourceId,
      pagination: { limit, cursor: null, tiebreaker: null },
      sortField,
      defaultIndex,
      inspect: isInspected,
    };

    return (
      <Query<GetTimelineQuery.Query, GetTimelineQuery.Variables>
        query={timelineQuery}
        fetchPolicy="network-only"
        notifyOnNetworkStatusChange
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
    if (id != null && timelineIds.some((timelineId) => timelineId === id)) {
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
