/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiOverlayMask,
  EuiToolTip,
  EuiTextArea,
} from '@elastic/eui';
import { pick } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import {
  TimelineTypeLiteral,
  TimelineType,
  TimelineStatusLiteral,
} from '../../../../../common/types/timeline';
import { timelineActions, timelineSelectors } from '../../../../timelines/store/timeline';
import {
  useDeepEqualSelector,
  useShallowEqualSelector,
} from '../../../../common/hooks/use_selector';

import { Notes } from '../../notes';
import { AssociateNote } from '../../notes/helpers';

import { NOTES_PANEL_WIDTH } from './notes_size';
import { ButtonContainer, DescriptionContainer, LabelText, NameField, NameWrapper } from './styles';
import * as i18n from './translations';
import { TimelineInput } from '../../../store/timeline/actions';
import { useCreateTimelineButton } from './use_create_timeline';
import { timelineDefaults } from '../../../store/timeline/defaults';

export const historyToolTip = 'The chronological history of actions related to this timeline';
export const streamLiveToolTip = 'Update the Timeline as new data arrives';
export const newTimelineToolTip = 'Create a new timeline';
export const TIMELINE_TITLE_CLASSNAME = 'timeline-title';

const NotesCountBadge = (styled(EuiBadge)`
  margin-left: 5px;
` as unknown) as typeof EuiBadge;

NotesCountBadge.displayName = 'NotesCountBadge';

export type SaveTimeline = (args: TimelineInput) => void;

interface AddToFavoritesButtonProps {
  timelineId: string;
}

const AddToFavoritesButtonComponent: React.FC<AddToFavoritesButtonProps> = ({ timelineId }) => {
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const isFavorite = useShallowEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).isFavorite
  );

  const handleClick = useCallback(
    () => dispatch(timelineActions.updateIsFavorite({ id: timelineId, isFavorite: !isFavorite })),
    [dispatch, timelineId, isFavorite]
  );

  return (
    <EuiButton
      isSelected={isFavorite}
      fill={isFavorite}
      iconType={isFavorite ? 'starFilled' : 'starEmpty'}
      onClick={handleClick}
    >
      {isFavorite ? i18n.REMOVE_FROM_FAVORITES : i18n.ADD_TO_FAVORITES}
    </EuiButton>
  );
};
AddToFavoritesButtonComponent.displayName = 'AddToFavoritesButtonComponent';

export const AddToFavoritesButton = React.memo(AddToFavoritesButtonComponent);

interface DescriptionProps {
  timelineId: string;
  isTextArea?: boolean;
  disableAutoSave?: boolean;
  disableTooltip?: boolean;
  disabled?: boolean;
}

export const Description = React.memo<DescriptionProps>(
  ({
    timelineId,
    isTextArea = false,
    disableAutoSave = false,
    disableTooltip = false,
    disabled = false,
  }) => {
    const dispatch = useDispatch();
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

    const description = useShallowEqualSelector(
      (state) => (getTimeline(state, timelineId) ?? timelineDefaults).description
    );

    const onDescriptionChanged = useCallback(
      (e) => {
        dispatch(
          timelineActions.updateDescription({
            id: timelineId,
            description: e.target.value,
            disableAutoSave,
          })
        );
      },
      [dispatch, disableAutoSave, timelineId]
    );

    const inputField = useMemo(
      () =>
        isTextArea ? (
          <EuiTextArea
            data-test-subj="timeline-description-textarea"
            aria-label={i18n.TIMELINE_DESCRIPTION}
            onChange={onDescriptionChanged}
            placeholder={i18n.DESCRIPTION}
            value={description}
            disabled={disabled}
          />
        ) : (
          <EuiFieldText
            aria-label={i18n.TIMELINE_DESCRIPTION}
            data-test-subj="timeline-description-input"
            onChange={onDescriptionChanged}
            placeholder={i18n.DESCRIPTION}
            spellCheck={true}
            value={description}
          />
        ),
      [description, isTextArea, onDescriptionChanged, disabled]
    );
    return (
      <DescriptionContainer data-test-subj="description-container">
        {disableTooltip ? (
          inputField
        ) : (
          <EuiToolTip
            data-test-subj="timeline-description-tool-tip"
            content={i18n.DESCRIPTION_TOOL_TIP}
          >
            {inputField}
          </EuiToolTip>
        )}
      </DescriptionContainer>
    );
  }
);
Description.displayName = 'Description';

interface NameProps {
  autoFocus?: boolean;
  disableAutoSave?: boolean;
  disableTooltip?: boolean;
  disabled?: boolean;
  timelineId: string;
}

export const Name = React.memo<NameProps>(
  ({
    autoFocus = false,
    disableAutoSave = false,
    disableTooltip = false,
    disabled = false,
    timelineId,
  }) => {
    const dispatch = useDispatch();
    const timelineNameRef = useRef<HTMLInputElement>(null);
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

    const { title, timelineType } = useDeepEqualSelector((state) =>
      pick(['title', 'timelineType'], getTimeline(state, timelineId) ?? timelineDefaults)
    );

    const handleChange = useCallback(
      (e) =>
        dispatch(
          timelineActions.updateTitle({ id: timelineId, title: e.target.value, disableAutoSave })
        ),
      [dispatch, timelineId, disableAutoSave]
    );

    useEffect(() => {
      if (autoFocus && timelineNameRef && timelineNameRef.current) {
        timelineNameRef.current.focus();
      }
    }, [autoFocus]);

    const nameField = useMemo(
      () => (
        <NameField
          aria-label={i18n.TIMELINE_TITLE}
          data-test-subj="timeline-title-input"
          disabled={disabled}
          onChange={handleChange}
          placeholder={
            timelineType === TimelineType.template ? i18n.UNTITLED_TEMPLATE : i18n.UNTITLED_TIMELINE
          }
          spellCheck={true}
          value={title}
          inputRef={timelineNameRef}
        />
      ),
      [handleChange, timelineType, title, disabled]
    );

    return (
      <NameWrapper>
        {disableTooltip ? (
          nameField
        ) : (
          <EuiToolTip data-test-subj="timeline-title-tool-tip" content={i18n.TITLE}>
            {nameField}
          </EuiToolTip>
        )}
      </NameWrapper>
    );
  }
);
Name.displayName = 'Name';

export interface NewTimelineProps {
  closeGearMenu?: () => void;
  outline?: boolean;
  timelineId: string;
  title?: string;
}

export const NewTimeline = React.memo<NewTimelineProps>(
  ({ closeGearMenu, outline = false, timelineId, title = i18n.NEW_TIMELINE }) => {
    const { getButton } = useCreateTimelineButton({
      timelineId,
      timelineType: TimelineType.default,
      closeGearMenu,
    });
    const button = getButton({ outline, title });

    return button;
  }
);
NewTimeline.displayName = 'NewTimeline';

interface NotesButtonProps {
  animate?: boolean;
  associateNote: AssociateNote;
  noteIds: string[];
  size: 's' | 'l';
  status: TimelineStatusLiteral;
  showNotes: boolean;
  toggleShowNotes: () => void;
  text?: string;
  toolTip?: string;
  timelineType: TimelineTypeLiteral;
}

interface LargeNotesButtonProps {
  noteIds: string[];
  text?: string;
  toggleShowNotes: () => void;
}

const LargeNotesButton = React.memo<LargeNotesButtonProps>(({ noteIds, text, toggleShowNotes }) => (
  <EuiButton data-test-subj="timeline-notes-button-large" onClick={toggleShowNotes} size="m">
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiIcon color="subdued" size="m" type="editorComment" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {text && text.length ? <LabelText>{text}</LabelText> : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <NotesCountBadge data-test-subj="timeline-notes-count" color="hollow">
          {noteIds.length}
        </NotesCountBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiButton>
));
LargeNotesButton.displayName = 'LargeNotesButton';

interface SmallNotesButtonProps {
  toggleShowNotes: () => void;
  timelineType: TimelineTypeLiteral;
}

const SmallNotesButton = React.memo<SmallNotesButtonProps>(({ toggleShowNotes, timelineType }) => {
  const isTemplate = timelineType === TimelineType.template;

  return (
    <EuiButtonIcon
      aria-label={i18n.NOTES}
      data-test-subj="timeline-notes-button-small"
      iconType="editorComment"
      onClick={toggleShowNotes}
      isDisabled={isTemplate}
    />
  );
});
SmallNotesButton.displayName = 'SmallNotesButton';

/**
 * The internal implementation of the `NotesButton`
 */
const NotesButtonComponent = React.memo<NotesButtonProps>(
  ({
    animate = true,
    associateNote,
    noteIds,
    showNotes,
    size,
    status,
    toggleShowNotes,
    text,
    timelineType,
  }) => (
    <ButtonContainer animate={animate} data-test-subj="timeline-notes-button-container">
      <>
        {size === 'l' ? (
          <LargeNotesButton noteIds={noteIds} text={text} toggleShowNotes={toggleShowNotes} />
        ) : (
          <SmallNotesButton toggleShowNotes={toggleShowNotes} timelineType={timelineType} />
        )}
        {size === 'l' && showNotes ? (
          <EuiOverlayMask>
            <EuiModal
              data-test-subj="notesModal"
              maxWidth={NOTES_PANEL_WIDTH}
              onClose={toggleShowNotes}
            >
              <Notes associateNote={associateNote} status={status} noteIds={noteIds} />
            </EuiModal>
          </EuiOverlayMask>
        ) : null}
      </>
    </ButtonContainer>
  )
);
NotesButtonComponent.displayName = 'NotesButtonComponent';

export const NotesButton = React.memo<NotesButtonProps>(
  ({
    animate = true,
    associateNote,
    noteIds,
    showNotes,
    size,
    status,
    timelineType,
    toggleShowNotes,
    toolTip,
    text,
  }) =>
    showNotes ? (
      <NotesButtonComponent
        animate={animate}
        associateNote={associateNote}
        noteIds={noteIds}
        showNotes={showNotes}
        size={size}
        status={status}
        toggleShowNotes={toggleShowNotes}
        text={text}
        timelineType={timelineType}
      />
    ) : (
      <EuiToolTip content={toolTip || ''} data-test-subj="timeline-notes-tool-tip">
        <NotesButtonComponent
          animate={animate}
          associateNote={associateNote}
          noteIds={noteIds}
          showNotes={showNotes}
          size={size}
          status={status}
          toggleShowNotes={toggleShowNotes}
          text={text}
          timelineType={timelineType}
        />
      </EuiToolTip>
    )
);
NotesButton.displayName = 'NotesButton';
