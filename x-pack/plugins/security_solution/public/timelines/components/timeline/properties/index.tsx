/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useMemo } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { TimelineStatusLiteral, TimelineTypeLiteral } from '../../../../../common/types/timeline';
import { useThrottledResizeObserver } from '../../../../common/components/utils';
import { Note } from '../../../../common/lib/note';
import { InputsModelId } from '../../../../common/store/inputs/constants';

import { AssociateNote, UpdateNote } from '../../notes/helpers';

import { TimelineProperties } from './styles';
import { PropertiesRight } from './properties_right';
import { PropertiesLeft } from './properties_left';
import { AllCasesModal } from '../../../../cases/components/all_cases_modal';
import { SecurityPageName } from '../../../../app/types';
import * as i18n from './translations';
import { State } from '../../../../common/store';
import { timelineSelectors } from '../../../store/timeline';
import { setInsertTimeline } from '../../../store/timeline/actions';
import { useKibana } from '../../../../common/lib/kibana';
import { APP_ID } from '../../../../../common/constants';
import { getCaseDetailsUrl } from '../../../../common/components/link_to';

type CreateTimeline = ({
  id,
  show,
  timelineType,
}: {
  id: string;
  show?: boolean;
  timelineType?: TimelineTypeLiteral;
}) => void;
type UpdateIsFavorite = ({ id, isFavorite }: { id: string; isFavorite: boolean }) => void;
type UpdateTitle = ({ id, title }: { id: string; title: string }) => void;
type UpdateDescription = ({ id, description }: { id: string; description: string }) => void;
type ToggleLock = ({ linkToId }: { linkToId: InputsModelId }) => void;

interface Props {
  associateNote: AssociateNote;
  createTimeline: CreateTimeline;
  description: string;
  getNotesByIds: (noteIds: string[]) => Note[];
  graphEventId?: string;
  isDataInTimeline: boolean;
  isDatepickerLocked: boolean;
  isFavorite: boolean;
  noteIds: string[];
  timelineId: string;
  timelineType: TimelineTypeLiteral;
  status: TimelineStatusLiteral;
  title: string;
  toggleLock: ToggleLock;
  updateDescription: UpdateDescription;
  updateIsFavorite: UpdateIsFavorite;
  updateNote: UpdateNote;
  updateTitle: UpdateTitle;
  usersViewing: string[];
}

const rightGutter = 60; // px
export const datePickerThreshold = 600;
export const showNotesThreshold = 810;
export const showDescriptionThreshold = 970;

const starIconWidth = 30;
const nameWidth = 155;
const descriptionWidth = 165;
const noteWidth = 130;
const settingsWidth = 55;

/** Displays the properties of a timeline, i.e. name, description, notes, etc */
export const Properties = React.memo<Props>(
  ({
    associateNote,
    createTimeline,
    description,
    getNotesByIds,
    graphEventId,
    isDataInTimeline,
    isDatepickerLocked,
    isFavorite,
    noteIds,
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
    const { navigateToApp } = useKibana().services.application;
    const { ref, width = 0 } = useThrottledResizeObserver(300);
    const [showActions, setShowActions] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const dispatch = useDispatch();

    const onButtonClick = useCallback(() => setShowActions(!showActions), [showActions]);
    const onToggleShowNotes = useCallback(() => setShowNotes(!showNotes), [showNotes]);
    const onClosePopover = useCallback(() => setShowActions(false), []);
    const onCloseTimelineModal = useCallback(() => setShowTimelineModal(false), []);
    const onToggleLock = useCallback(() => toggleLock({ linkToId: 'timeline' }), [toggleLock]);
    const onOpenTimelineModal = useCallback(() => {
      onClosePopover();
      setShowTimelineModal(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [showCaseModal, setShowCaseModal] = useState(false);
    const onCloseCaseModal = useCallback(() => setShowCaseModal(false), []);
    const onOpenCaseModal = useCallback(() => setShowCaseModal(true), []);
    const currentTimeline = useSelector((state: State) =>
      timelineSelectors.selectTimeline(state, timelineId)
    );

    const onRowClick = useCallback(
      (id: string) => {
        onCloseCaseModal();

        navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
          path: getCaseDetailsUrl({ id }),
        }).then(() =>
          dispatch(
            setInsertTimeline({
              graphEventId,
              timelineId,
              timelineSavedObjectId: currentTimeline.savedObjectId,
              timelineTitle: title.length > 0 ? title : i18n.UNTITLED_TIMELINE,
            })
          )
        );
      },
      [currentTimeline, dispatch, graphEventId, navigateToApp, onCloseCaseModal, timelineId, title]
    );

    const datePickerWidth = useMemo(
      () =>
        width -
        rightGutter -
        starIconWidth -
        nameWidth -
        (width >= showDescriptionThreshold ? descriptionWidth : 0) -
        noteWidth -
        settingsWidth,
      [width]
    );

    return (
      <TimelineProperties ref={ref} data-test-subj="timeline-properties">
        <PropertiesLeft
          associateNote={associateNote}
          datePickerWidth={
            datePickerWidth > datePickerThreshold ? datePickerThreshold : datePickerWidth
          }
          description={description}
          getNotesByIds={getNotesByIds}
          isDatepickerLocked={isDatepickerLocked}
          isFavorite={isFavorite}
          noteIds={noteIds}
          onToggleShowNotes={onToggleShowNotes}
          status={status}
          showDescription={width >= showDescriptionThreshold}
          showNotes={showNotes}
          showNotesFromWidth={width >= showNotesThreshold}
          timelineId={timelineId}
          timelineType={timelineType}
          title={title}
          toggleLock={onToggleLock}
          updateDescription={updateDescription}
          updateIsFavorite={updateIsFavorite}
          updateNote={updateNote}
          updateTitle={updateTitle}
        />
        <PropertiesRight
          associateNote={associateNote}
          description={description}
          getNotesByIds={getNotesByIds}
          graphEventId={graphEventId}
          isDataInTimeline={isDataInTimeline}
          noteIds={noteIds}
          onButtonClick={onButtonClick}
          onClosePopover={onClosePopover}
          onCloseTimelineModal={onCloseTimelineModal}
          onOpenCaseModal={onOpenCaseModal}
          onOpenTimelineModal={onOpenTimelineModal}
          onToggleShowNotes={onToggleShowNotes}
          showActions={showActions}
          showDescription={width < showDescriptionThreshold}
          showNotes={showNotes}
          showNotesFromWidth={width < showNotesThreshold}
          showTimelineModal={showTimelineModal}
          showUsersView={title.length > 0}
          status={status}
          timelineId={timelineId}
          timelineType={timelineType}
          title={title}
          updateDescription={updateDescription}
          updateNote={updateNote}
          usersViewing={usersViewing}
        />
        <AllCasesModal
          onCloseCaseModal={onCloseCaseModal}
          showCaseModal={showCaseModal}
          onRowClick={onRowClick}
        />
      </TimelineProperties>
    );
  }
);

Properties.displayName = 'Properties';
