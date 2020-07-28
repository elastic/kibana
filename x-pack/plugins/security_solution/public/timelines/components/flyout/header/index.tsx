/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';

import { isEmpty, get } from 'lodash/fp';
import { TimelineType } from '../../../../../common/types/timeline';
import { History } from '../../../../common/lib/history';
import { Note } from '../../../../common/lib/note';
import { appSelectors, inputsModel, inputsSelectors, State } from '../../../../common/store';
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
    description,
    graphEventId,
    isDataInTimeline,
    isDatepickerLocked,
    isFavorite,
    noteIds,
    notesById,
    status,
    timelineId,
    timelineType,
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
        description={description}
        getNotesByIds={getNotesByIds}
        graphEventId={graphEventId}
        isDataInTimeline={isDataInTimeline}
        isDatepickerLocked={isDatepickerLocked}
        isFavorite={isFavorite}
        noteIds={noteIds}
        status={status}
        timelineId={timelineId}
        timelineType={timelineType}
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
      graphEventId,
      isFavorite = false,
      kqlQuery,
      title = '',
      noteIds = emptyNotesId,
      status,
      timelineType = TimelineType.default,
    } = timeline;

    const history = emptyHistory; // TODO: get history from store via selector

    return {
      description,
      graphEventId,
      history,
      isDataInTimeline:
        !isEmpty(dataProviders) || !isEmpty(get('filterQuery.kuery.expression', kqlQuery)),
      isFavorite,
      isDatepickerLocked: globalInput.linkTo.includes('timeline'),
      noteIds,
      notesById: getNotesByIds(state),
      status,
      title,
      timelineType,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch, { timelineId }: OwnProps) => ({
  associateNote: (noteId: string) => dispatch(timelineActions.addNote({ id: timelineId, noteId })),
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
