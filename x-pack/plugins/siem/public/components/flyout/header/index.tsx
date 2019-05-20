/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { Dispatch } from 'redux';
import { ActionCreator } from 'typescript-fsa';

import { History } from '../../../lib/history';
import { Note } from '../../../lib/note';
import {
  appSelectors,
  inputsModel,
  inputsSelectors,
  State,
  timelineSelectors,
} from '../../../store';
import { UpdateNote } from '../../notes/helpers';
import { defaultHeaders } from '../../timeline/body/column_headers/default_headers';
import { Properties } from '../../timeline/properties';
import { appActions } from '../../../store/app';
import { inputsActions } from '../../../store/inputs';
import { timelineActions } from '../../../store/actions';
import { TimelineModel } from '../../../store/timeline/model';
import { DEFAULT_TIMELINE_WIDTH } from '../../timeline/body/helpers';

interface OwnProps {
  timelineId: string;
  usersViewing: string[];
}

interface StateReduxProps {
  description: string;
  getNotesByIds: (noteIds: string[]) => Note[];
  isFavorite: boolean;
  isDatepickerLocked: boolean;
  noteIds: string[];
  title: string;
  width: number;
}

interface DispatchProps {
  associateNote: (noteId: string) => void;
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
  createTimeline: ActionCreator<{ id: string; show?: boolean }>;
  toggleLock: ActionCreator<{ linkToId: inputsModel.InputsModelId }>;
  updateDescription: ActionCreator<{ id: string; description: string }>;
  updateIsFavorite: ActionCreator<{ id: string; isFavorite: boolean }>;
  updateNote: UpdateNote;
  updateTitle: ActionCreator<{ id: string; title: string }>;
}

type Props = OwnProps & StateReduxProps & DispatchProps;

const statefulFlyoutHeader = pure<Props>(
  ({
    associateNote,
    createTimeline,
    description,
    getNotesByIds,
    isFavorite,
    isDatepickerLocked,
    title,
    width = DEFAULT_TIMELINE_WIDTH,
    noteIds,
    timelineId,
    toggleLock,
    updateDescription,
    updateIsFavorite,
    updateNote,
    updateTitle,
    usersViewing,
  }) => (
    <Properties
      associateNote={associateNote}
      createTimeline={createTimeline}
      description={description}
      getNotesByIds={getNotesByIds}
      isDatepickerLocked={isDatepickerLocked}
      isFavorite={isFavorite}
      title={title}
      noteIds={noteIds}
      timelineId={timelineId}
      toggleLock={toggleLock}
      updateDescription={updateDescription}
      updateIsFavorite={updateIsFavorite}
      updateTitle={updateTitle}
      updateNote={updateNote}
      usersViewing={usersViewing}
      width={width}
    />
  )
);

const emptyHistory: History[] = []; // stable reference

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getNotesByIds = appSelectors.notesByIdsSelector();
  const getGlobalInput = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId);
    const globalInput: inputsModel.InputsRange = getGlobalInput(state);
    const {
      description = '',
      isFavorite = false,
      title = '',
      noteIds = [],
      width = DEFAULT_TIMELINE_WIDTH,
    } = timeline;

    const history = emptyHistory; // TODO: get history from store via selector

    return {
      description,
      getNotesByIds: getNotesByIds(state),
      history,
      isFavorite,
      isDatepickerLocked: globalInput.linkTo.includes('timeline'),
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
  toggleLock: ({ linkToId }: { linkToId: inputsModel.InputsModelId }) => {
    dispatch(inputsActions.toggleTimelineLinkTo({ linkToId }));
  },
});

export const FlyoutHeader = connect(
  makeMapStateToProps,
  mapDispatchToProps
)(statefulFlyoutHeader);
