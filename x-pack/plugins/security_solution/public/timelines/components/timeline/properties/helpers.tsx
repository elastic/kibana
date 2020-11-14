/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
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
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { APP_ID } from '../../../../../common/constants';
import {
  TimelineTypeLiteral,
  TimelineStatus,
  TimelineType,
  TimelineStatusLiteral,
  TimelineId,
} from '../../../../../common/types/timeline';
import { SecurityPageName } from '../../../../app/types';
import { timelineActions, timelineSelectors } from '../../../../timelines/store/timeline';
import { getCreateCaseUrl } from '../../../../common/components/link_to';
import { useKibana } from '../../../../common/lib/kibana';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';

import { Notes } from '../../notes';
import { AssociateNote } from '../../notes/helpers';

import { NOTES_PANEL_WIDTH } from './notes_size';
import { ButtonContainer, DescriptionContainer, LabelText, NameField, NameWrapper } from './styles';
import * as i18n from './translations';
import { setInsertTimeline, showTimeline, TimelineInput } from '../../../store/timeline/actions';
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

export const StarIcon = React.memo<{
  timelineId: string;
}>(({ timelineId }) => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const dispatch = useDispatch();

  const { isFavorite } = useShallowEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
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
      {isFavorite ? i18n.NOT_A_FAVORITE : i18n.FAVORITE}
    </EuiButton>
  );
});
StarIcon.displayName = 'StarIcon';

interface DescriptionProps {
  timelineId: string;
  isTextArea?: boolean;
  disableAutoSave?: boolean;
  disableTooltip?: boolean;
  disabled?: boolean;
  marginRight?: number;
}

export const Description = React.memo<DescriptionProps>(
  ({
    timelineId,
    isTextArea = false,
    disableAutoSave = false,
    disableTooltip = false,
    disabled = false,
    marginRight,
  }) => {
    const getTimeline = timelineSelectors.getTimelineByIdSelector();
    const dispatch = useDispatch();

    const { description } = useShallowEqualSelector(
      (state) => getTimeline(state, timelineId) ?? timelineDefaults
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
            data-test-subj="timeline-description"
            onChange={onDescriptionChanged}
            placeholder={i18n.DESCRIPTION}
            spellCheck={true}
            value={description}
          />
        ),
      [description, isTextArea, onDescriptionChanged, disabled]
    );
    return (
      <DescriptionContainer data-test-subj="description-container" marginRight={marginRight}>
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
    const timelineNameRef = useRef<HTMLInputElement>(null);
    const getTimeline = timelineSelectors.getTimelineByIdSelector();
    const dispatch = useDispatch();

    const { title, timelineType } = useShallowEqualSelector(
      (state) => getTimeline(state, timelineId) ?? timelineDefaults
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
          data-test-subj="timeline-title"
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

interface NewCaseProps {
  compact?: boolean;
  graphEventId?: string;
  onClosePopover: () => void;
  timelineId: string;
  timelineStatus: TimelineStatus;
  timelineTitle: string;
}

export const NewCase = React.memo<NewCaseProps>(
  ({ compact, graphEventId, onClosePopover, timelineId, timelineStatus, timelineTitle }) => {
    const dispatch = useDispatch();
    const { savedObjectId } = useShallowEqualSelector((state) =>
      timelineSelectors.selectTimeline(state, timelineId)
    );
    const { navigateToApp } = useKibana().services.application;
    const buttonText = compact ? i18n.ATTACH_TO_NEW_CASE : i18n.ATTACH_TIMELINE_TO_NEW_CASE;

    const handleClick = useCallback(() => {
      onClosePopover();

      dispatch(showTimeline({ id: TimelineId.active, show: false }));

      navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
        path: getCreateCaseUrl(),
      }).then(() =>
        dispatch(
          setInsertTimeline({
            graphEventId,
            timelineId,
            timelineSavedObjectId: savedObjectId,
            timelineTitle: timelineTitle.length > 0 ? timelineTitle : i18n.UNTITLED_TIMELINE,
          })
        )
      );
    }, [
      dispatch,
      graphEventId,
      navigateToApp,
      onClosePopover,
      savedObjectId,
      timelineId,
      timelineTitle,
    ]);

    const button = useMemo(
      () => (
        <EuiButtonEmpty
          data-test-subj="attach-timeline-case"
          color={compact ? undefined : 'text'}
          iconSide="left"
          iconType="paperClip"
          disabled={timelineStatus === TimelineStatus.draft}
          onClick={handleClick}
          size={compact ? 'xs' : undefined}
        >
          {buttonText}
        </EuiButtonEmpty>
      ),
      [compact, timelineStatus, handleClick, buttonText]
    );
    return timelineStatus === TimelineStatus.draft ? (
      <EuiToolTip position="left" content={i18n.ATTACH_TIMELINE_TO_CASE_TOOLTIP}>
        {button}
      </EuiToolTip>
    ) : (
      button
    );
  }
);
NewCase.displayName = 'NewCase';

interface ExistingCaseProps {
  compact?: boolean;
  onClosePopover: () => void;
  onOpenCaseModal: () => void;
  timelineStatus: TimelineStatus;
}
export const ExistingCase = React.memo<ExistingCaseProps>(
  ({ compact, onClosePopover, onOpenCaseModal, timelineStatus }) => {
    const handleClick = useCallback(() => {
      onClosePopover();
      onOpenCaseModal();
    }, [onOpenCaseModal, onClosePopover]);
    const buttonText = compact
      ? i18n.ATTACH_TO_EXISTING_CASE
      : i18n.ATTACH_TIMELINE_TO_EXISTING_CASE;

    const button = useMemo(
      () => (
        <EuiButtonEmpty
          data-test-subj="attach-timeline-existing-case"
          color={compact ? undefined : 'text'}
          iconSide="left"
          iconType="paperClip"
          disabled={timelineStatus === TimelineStatus.draft}
          onClick={handleClick}
          size={compact ? 'xs' : undefined}
        >
          {buttonText}
        </EuiButtonEmpty>
      ),
      [buttonText, handleClick, timelineStatus, compact]
    );
    return timelineStatus === TimelineStatus.draft ? (
      <EuiToolTip position="left" content={i18n.ATTACH_TIMELINE_TO_CASE_TOOLTIP}>
        {button}
      </EuiToolTip>
    ) : (
      button
    );
  }
);
ExistingCase.displayName = 'ExistingCase';

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
