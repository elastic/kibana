/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { Dispatch } from 'redux';

import { History } from '../../../lib/history';
import { Note } from '../../../lib/note';
import {
  appActions,
  appSelectors,
  State,
  timelineActions,
  timelineModel,
  timelineSelectors,
} from '../../../store';
import { UpdateNote } from '../../notes/helpers';
import { defaultWidth } from '../../timeline/body';
import { defaultHeaders } from '../../timeline/body/column_headers/default_headers';
import { Properties } from '../../timeline/properties';

interface OwnProps {
  timelineId: string;
  usersViewing: string[];
}

interface StateReduxProps {
  description?: string;
  getNotesByIds: (noteIds: string[]) => Note[];
  history?: History[];
  isFavorite?: boolean;
  isLive?: boolean;
  noteIds: string[];
  title?: string;
  width?: number;
}

interface DispatchProps {
  associateNote?: (noteId: string) => void;
  applyDeltaToWidth?: (
    {
      id,
      delta,
      bodyClientWidthPixels,
      maxWidthPercent,
      minWidthPixels,
    }: {
      id: string;
      delta: number;
      bodyClientWidthPixels: number;
      maxWidthPercent: number;
      minWidthPixels: number;
    }
  ) => void;
  createTimeline?: ({ id, show }: { id: string; show?: boolean }) => void;
  updateDescription?: ({ id, description }: { id: string; description: string }) => void;
  updateIsFavorite?: ({ id, isFavorite }: { id: string; isFavorite: boolean }) => void;
  updateIsLive?: ({ id, isLive }: { id: string; isLive: boolean }) => void;
  updateNote?: UpdateNote;
  updateTitle?: ({ id, title }: { id: string; title: string }) => void;
}

type Props = OwnProps & StateReduxProps & DispatchProps;

const statefulFlyoutHeader = pure<Props>(
  ({
    associateNote,
    createTimeline,
    description,
    getNotesByIds,
    history,
    isFavorite,
    isLive,
    title,
    width = defaultWidth,
    noteIds,
    timelineId,
    updateDescription,
    updateIsFavorite,
    updateIsLive,
    updateNote,
    updateTitle,
    usersViewing,
  }) => (
    <Properties
      associateNote={associateNote!}
      createTimeline={createTimeline!}
      description={description!}
      getNotesByIds={getNotesByIds}
      history={history!}
      isFavorite={isFavorite!}
      isLive={isLive!}
      title={title!}
      noteIds={noteIds}
      timelineId={timelineId}
      updateDescription={updateDescription!}
      updateIsFavorite={updateIsFavorite!}
      updateIsLive={updateIsLive!}
      updateTitle={updateTitle!}
      updateNote={updateNote!}
      usersViewing={usersViewing}
      width={width}
    />
  )
);

const emptyHistory: History[] = []; // stable reference

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getNotesByIds = appSelectors.notesByIdsSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: timelineModel.TimelineModel = getTimeline(state, timelineId);

    const {
      description = '',
      isFavorite = false,
      isLive = false,
      title = '',
      noteIds = [],
      width = defaultWidth,
    } = timeline;

    const history = emptyHistory; // TODO: get history from store via selector

    return {
      description,
      getNotesByIds: getNotesByIds(state),
      history,
      isFavorite,
      isLive,
      noteIds,
      title,
      width,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch, { timelineId }: OwnProps) => ({
  associateNote: (noteId: string) => {
    dispatch(timelineActions.addNote({ id: timelineId, noteId }));
  },
  applyDeltaToWidth: ({
    id,
    delta,
    bodyClientWidthPixels,
    maxWidthPercent,
    minWidthPixels,
  }: {
    id: string;
    delta: number;
    bodyClientWidthPixels: number;
    maxWidthPercent: number;
    minWidthPixels: number;
  }) => {
    dispatch(
      timelineActions.applyDeltaToWidth({
        id,
        delta,
        bodyClientWidthPixels,
        maxWidthPercent,
        minWidthPixels,
      })
    );
  },
  createTimeline: ({ id, show }: { id: string; show?: boolean }) => {
    dispatch(timelineActions.createTimeline({ id, columns: defaultHeaders, show }));
  },
  updateDescription: ({ id, description }: { id: string; description: string }) => {
    dispatch(timelineActions.updateDescription({ id, description }));
  },
  updateIsFavorite: ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
    dispatch(timelineActions.updateIsFavorite({ id, isFavorite }));
  },
  updateIsLive: ({ id, isLive }: { id: string; isLive: boolean }) => {
    dispatch(timelineActions.updateIsLive({ id, isLive }));
  },
  updateNote: (note: Note) => {
    dispatch(appActions.updateNote({ note }));
  },
  updateTitle: ({ id, title }: { id: string; title: string }) => {
    dispatch(timelineActions.updateTitle({ id, title }));
  },
});

export const FlyoutHeader = connect(
  makeMapStateToProps,
  mapDispatchToProps
)(statefulFlyoutHeader);
