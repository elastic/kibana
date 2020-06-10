/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';

import { isEmpty, get } from 'lodash/fp';
import { History } from '../../../../common/lib/history';
import { Note } from '../../../../common/lib/note';
import { appSelectors, inputsModel, inputsSelectors, State } from '../../../../common/store';
import { defaultHeaders } from '../../timeline/body/column_headers/default_headers';
import { Properties } from '../../timeline/properties';
import { appActions } from '../../../../common/store/app';
import { inputsActions } from '../../../../common/store/inputs';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { TimelineModel } from '../../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { InputsModelId } from '../../../../common/store/inputs/constants';

interface OwnProps {
  timelineId: string;
  usersViewing: string[];
}

type Props = OwnProps & PropsFromRedux;

const StatefulFlyoutHeader = React.memo<Props>(
  ({
    associateNote,
    createTimeline,
    description,
    isDataInTimeline,
    isDatepickerLocked,
    isFavorite,
    noteIds,
    notesById,
    status,
    timelineId,
    title,
    toggleLock,
    updateDescription,
    updateIsFavorite,
    updateNote,
    updateTitle,
    usersViewing,
  }) => {
    const getNotesByIds = useCallback(
      (noteIdsVar: string[]): Note[] => appSelectors.getNotes(notesById, noteIdsVar),
      [notesById]
    );
    return (
      <Properties
        associateNote={associateNote}
        createTimeline={createTimeline}
        description={description}
        getNotesByIds={getNotesByIds}
        isDataInTimeline={isDataInTimeline}
        isDatepickerLocked={isDatepickerLocked}
        isFavorite={isFavorite}
        noteIds={noteIds}
        status={status}
        timelineId={timelineId}
        title={title}
        toggleLock={toggleLock}
        updateDescription={updateDescription}
        updateIsFavorite={updateIsFavorite}
        updateNote={updateNote}
        updateTitle={updateTitle}
        usersViewing={usersViewing}
      />
    );
  }
);

StatefulFlyoutHeader.displayName = 'StatefulFlyoutHeader';

const emptyHistory: History[] = []; // stable reference

const emptyNotesId: string[] = []; // stable reference

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getNotesByIds = appSelectors.notesByIdsSelector();
  const getGlobalInput = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const globalInput: inputsModel.InputsRange = getGlobalInput(state);
    const {
      dataProviders,
      description = '',
      isFavorite = false,
      kqlQuery,
      title = '',
      noteIds = emptyNotesId,
      status,
    } = timeline;

    const history = emptyHistory; // TODO: get history from store via selector

    return {
      description,
      notesById: getNotesByIds(state),
      history,
      isDataInTimeline:
        !isEmpty(dataProviders) || !isEmpty(get('filterQuery.kuery.expression', kqlQuery)),
      isFavorite,
      isDatepickerLocked: globalInput.linkTo.includes('timeline'),
      noteIds,
      status,
      title,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch, { timelineId }: OwnProps) => ({
  associateNote: (noteId: string) => dispatch(timelineActions.addNote({ id: timelineId, noteId })),
  createTimeline: ({ id, show }: { id: string; show?: boolean }) =>
    dispatch(
      timelineActions.createTimeline({
        id,
        columns: defaultHeaders,
        show,
      })
    ),
  updateDescription: ({ id, description }: { id: string; description: string }) =>
    dispatch(timelineActions.updateDescription({ id, description })),
  updateIsFavorite: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
    dispatch(timelineActions.updateIsFavorite({ id, isFavorite })),
  updateIsLive: ({ id, isLive }: { id: string; isLive: boolean }) =>
    dispatch(timelineActions.updateIsLive({ id, isLive })),
  updateNote: (note: Note) => dispatch(appActions.updateNote({ note })),
  updateTitle: ({ id, title }: { id: string; title: string }) =>
    dispatch(timelineActions.updateTitle({ id, title })),
  toggleLock: ({ linkToId }: { linkToId: InputsModelId }) =>
    dispatch(inputsActions.toggleTimelineLinkTo({ linkToId })),
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const FlyoutHeader = connector(StatefulFlyoutHeader);
