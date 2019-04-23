/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import ApolloClient from 'apollo-client';
import { getOr, merge } from 'lodash/fp';
import { ActionCreator } from 'typescript-fsa';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';

import { HeaderPage } from '../../components/header_page';
import { StatefulOpenTimeline } from '../../components/open_timeline';
import { defaultHeaders } from '../../components/timeline/body/column_headers/default_headers';
import { ColumnHeader } from '../../components/timeline/body/column_headers/column_header';
import { deleteTimelineMutation } from '../../containers/timeline/delete/persist.gql_query';
import { AllTimelinesVariables } from '../../containers/timeline/all';

import { allTimelinesQuery } from '../../containers/timeline/all/index.gql_query';
import { oneTimelineQuery } from '../../containers/timeline/one/index.gql_query';
import { DeleteTimelineMutation, GetOneTimeline, TimelineResult } from '../../graphql/types';
import { Note } from '../../lib/note';
import { State, timelineSelectors } from '../../store';
import { addNotes as dispatchAddNotes } from '../../store/app/actions';
import { setTimelineRangeDatePicker as dispatchSetTimelineRangeDatePicker } from '../../store/inputs/actions';
import {
  addTimeline as dispatchAddTimeline,
  createTimeline as dispatchCreateNewTimeline,
  updateIsLoading as dispatchUpdateIsLoading,
} from '../../store/timeline/actions';
import { TimelineModel } from '../../store/timeline/model';

import * as i18n from './translations';

const TimelinesContainer = styled.div`
  width: 100%:
`;

interface Props {
  timeline: TimelineModel;
}

interface TimelinesProps<TCache = object> {
  apolloClient: ApolloClient<TCache>;
}

interface DispatchProps {
  addTimeline: ActionCreator<{ id: string; timeline: TimelineModel }>;
  addNotes: ActionCreator<{ notes: Note[] }>;
  createNewTimeline: ActionCreator<{
    id: string;
    columns: ColumnHeader[];
    show?: boolean;
  }>;
  setTimelineRangeDatePicker: ActionCreator<{
    from: number;
    to: number;
  }>;
  updateIsLoading: ActionCreator<{ id: string; isLoading: boolean }>;
}

type OwnProps = Props & TimelinesProps & DispatchProps;

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;

class Timelines extends React.PureComponent<OwnProps> {
  public render() {
    return (
      <>
        <HeaderPage title={i18n.PAGE_TITLE} />

        <TimelinesContainer>
          <StatefulOpenTimeline
            deleteTimelines={this.deleteTimelines}
            openTimeline={this.openTimeline}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={i18n.ALL_TIMELINES_PANEL_TITLE}
          />
        </TimelinesContainer>
      </>
    );
  }

  private openTimeline = ({
    duplicate,
    timelineId,
  }: {
    duplicate: boolean;
    timelineId: string;
  }) => {
    const { addNotes, addTimeline, setTimelineRangeDatePicker, updateIsLoading } = this.props;

    updateIsLoading({ id: 'timeline-1', isLoading: true });
    this.props.apolloClient
      .query<GetOneTimeline.Query, GetOneTimeline.Variables>({
        query: oneTimelineQuery,
        fetchPolicy: 'no-cache',
        variables: { id: timelineId },
      })
      .then(result => {
        const timelineToOpen: TimelineResult = omitTypenameInTimeline(
          getOr({}, 'data.getOneTimeline', result)
        );
        const { notes, ...timelineModel } = timelineToOpen;
        const momentDate = dateMath.parse('now-24h');
        setTimelineRangeDatePicker({
          from: getOr(momentDate ? momentDate.valueOf() : 0, 'dateRange.start', timelineModel),
          to: getOr(Date.now(), 'dateRange.end', timelineModel),
        });
        addTimeline({
          id: 'timeline-1',
          timeline: {
            ...merge(this.props.timeline, timelineModel),
            eventIdToNoteIds:
              timelineModel.eventIdToNoteIds != null
                ? timelineModel.eventIdToNoteIds.reduce((acc, note) => {
                    if (note.eventId != null) {
                      const eventNotes = getOr([], note.eventId, acc);
                      return { ...acc, [note.eventId]: [...eventNotes, note.noteId] };
                    }
                    return acc;
                  }, {})
                : {},
            isFavorite: timelineModel.favorite != null ? timelineModel.favorite.length > 0 : false,
            isLive: false,
            isSaving: false,
            itemsPerPage: 25,
            pinnedEventIds:
              timelineModel.pinnedEventIds != null
                ? timelineModel.pinnedEventIds.reduce(
                    (acc, pinnedEventId) => ({ ...acc, [pinnedEventId]: true }),
                    {}
                  )
                : {},
            pinnedEventsSaveObject:
              timelineModel.pinnedEventsSaveObject != null
                ? timelineModel.pinnedEventsSaveObject.reduce(
                    (acc, pinnedEvent) => ({ ...acc, [pinnedEvent.pinnedEventId]: pinnedEvent }),
                    {}
                  )
                : {},
            savedObjectId: duplicate ? null : timelineModel.savedObjectId,
            title: duplicate ? '' : timelineModel.title || '',
          },
        });
        addNotes({
          notes:
            notes != null
              ? notes.map<Note>(note => ({
                  created: note.created != null ? new Date(note.created) : new Date(),
                  id: note.noteId,
                  lastEdit: note.updated != null ? new Date(note.updated) : new Date(),
                  note: note.note || '',
                  user: note.updatedBy || 'unknown',
                  saveObjectId: note.noteId,
                  version: note.version,
                }))
              : [],
        });
      })
      .finally(() => {
        updateIsLoading({ id: 'timeline-1', isLoading: false });
      });
  };

  private deleteTimelines = (timelineIds: string[], variables?: AllTimelinesVariables) => {
    if (timelineIds.includes(this.props.timeline.savedObjectId || '')) {
      this.props.createNewTimeline({ id: 'timeline-1', columns: defaultHeaders, show: false });
    }
    this.props.apolloClient.mutate<
      DeleteTimelineMutation.Mutation,
      DeleteTimelineMutation.Variables
    >({
      mutation: deleteTimelineMutation,
      fetchPolicy: 'no-cache',
      variables: { id: timelineIds },
      refetchQueries: [
        {
          query: allTimelinesQuery,
          variables,
        },
      ],
    });
  };
}
const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State) => {
    const timeline = getTimeline(state, 'timeline-1');

    return {
      timeline,
    };
  };
  return mapStateToProps;
};

export const TimelinesPage = connect(
  makeMapStateToProps,
  {
    addTimeline: dispatchAddTimeline,
    addNotes: dispatchAddNotes,
    createNewTimeline: dispatchCreateNewTimeline,
    setTimelineRangeDatePicker: dispatchSetTimelineRangeDatePicker,
    updateIsLoading: dispatchUpdateIsLoading,
  }
)(Timelines);

const omitTypename = (key: string, value: keyof TimelineModel) =>
  key === '__typename' ? undefined : value;

const omitTypenameInTimeline = (timeline: TimelineResult): TimelineResult =>
  JSON.parse(JSON.stringify(timeline), omitTypename);
