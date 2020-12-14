/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiButton, EuiButtonIcon, EuiToolTip, EuiTextArea } from '@elastic/eui';
import { pick } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { TimelineTypeLiteral, TimelineType } from '../../../../../common/types/timeline';
import { timelineActions, timelineSelectors } from '../../../../timelines/store/timeline';
import {
  useDeepEqualSelector,
  useShallowEqualSelector,
} from '../../../../common/hooks/use_selector';

import { DescriptionContainer, NameField, NameWrapper } from './styles';
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
      data-test-subj={`timeline-favorite-${isFavorite ? 'filled' : 'empty'}-star`}
    >
      {isFavorite ? i18n.REMOVE_FROM_FAVORITES : i18n.ADD_TO_FAVORITES}
    </EuiButton>
  );
};
AddToFavoritesButtonComponent.displayName = 'AddToFavoritesButtonComponent';

export const AddToFavoritesButton = React.memo(AddToFavoritesButtonComponent);

interface DescriptionProps {
  autoFocus?: boolean;
  timelineId: string;
  disableAutoSave?: boolean;
  disableTooltip?: boolean;
  disabled?: boolean;
}

export const Description = React.memo<DescriptionProps>(
  ({
    autoFocus = false,
    timelineId,
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
      () => (
        <EuiTextArea
          autoFocus={autoFocus}
          data-test-subj="timeline-description-textarea"
          aria-label={i18n.TIMELINE_DESCRIPTION}
          fullWidth
          onChange={onDescriptionChanged}
          placeholder={i18n.DESCRIPTION}
          value={description}
          disabled={disabled}
        />
      ),
      [autoFocus, description, onDescriptionChanged, disabled]
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

    const nameField = useMemo(
      () => (
        <NameField
          autoFocus={autoFocus}
          aria-label={i18n.TIMELINE_TITLE}
          data-test-subj="timeline-title-input"
          disabled={disabled}
          onChange={handleChange}
          placeholder={
            timelineType === TimelineType.template ? i18n.UNTITLED_TEMPLATE : i18n.UNTITLED_TIMELINE
          }
          spellCheck={true}
          value={title}
        />
      ),
      [autoFocus, handleChange, timelineType, title, disabled]
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
  showNotes: boolean;
  toggleShowNotes: () => void;
  toolTip?: string;
  timelineType: TimelineTypeLiteral;
}

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

export const NotesButton = React.memo<NotesButtonProps>(
  ({ showNotes, timelineType, toggleShowNotes, toolTip }) =>
    showNotes ? (
      <SmallNotesButton toggleShowNotes={toggleShowNotes} timelineType={timelineType} />
    ) : (
      <EuiToolTip content={toolTip || ''} data-test-subj="timeline-notes-tool-tip">
        <SmallNotesButton toggleShowNotes={toggleShowNotes} timelineType={timelineType} />
      </EuiToolTip>
    )
);
NotesButton.displayName = 'NotesButton';
