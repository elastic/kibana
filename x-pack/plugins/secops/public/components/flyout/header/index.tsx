/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultTo, getOr } from 'lodash/fp';
import * as React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { Dispatch } from 'redux';
import { History } from '../../../lib/history';
import { Note } from '../../../lib/note';
import { getApplicableNotes } from '../../../lib/note/helpers';
import {
  appActions,
  appSelectors,
  State,
  timelineActions,
  timelineSelectors,
} from '../../../store';
import { UpdateNote } from '../../notes/helpers';
import { defaultWidth } from '../../timeline/body';
import { Properties } from '../../timeline/properties';

interface OwnProps {
  timelineId: string;
}

interface StateReduxProps {
  description?: string;
  history?: History[];
  isFavorite?: boolean;
  isLive?: boolean;
  title?: string;
  notes?: Note[];
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
    history,
    isFavorite,
    isLive,
    title,
    width = defaultWidth,
    notes,
    timelineId,
    updateDescription,
    updateIsFavorite,
    updateIsLive,
    updateNote,
    updateTitle,
  }) => (
    <Properties
      associateNote={associateNote!}
      createTimeline={createTimeline!}
      description={description!}
      history={history!}
      isFavorite={isFavorite!}
      isLive={isLive!}
      title={title!}
      notes={notes!}
      timelineId={timelineId}
      updateDescription={updateDescription!}
      updateIsFavorite={updateIsFavorite!}
      updateIsLive={updateIsLive!}
      updateTitle={updateTitle!}
      updateNote={updateNote!}
      width={width}
    />
  )
);

const emptyHistory: History[] = []; // stable reference

const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
  const timelineById = defaultTo({}, timelineSelectors.timelineByIdSelector(state));

  const description = getOr('', `${timelineId}.description`, timelineById);
  const history = emptyHistory; // TODO: get notes from store via selector
  const isFavorite = getOr(false, `${timelineId}.isFavorite`, timelineById);
  const isLive = getOr(false, `${timelineId}.isLive`, timelineById);
  const title = getOr('', `${timelineId}.title`, timelineById);
  const noteIds = getOr([], `${timelineId}.noteIds`, timelineById);
  const notesById = appSelectors.notesByIdSelector(state);
  const notes = getApplicableNotes({ noteIds, notesById });
  const width = getOr(defaultWidth, `${timelineId}.width`, timelineById);

  return { description, history, isFavorite, isLive, notes, title, width };
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
    dispatch(timelineActions.createTimeline({ id, show }));
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
  mapStateToProps,
  mapDispatchToProps
)(statefulFlyoutHeader);
