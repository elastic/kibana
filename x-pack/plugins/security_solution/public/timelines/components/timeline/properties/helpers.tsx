/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButton, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import type { TimelineTypeLiteral } from '../../../../../common/api/timeline';
import { TimelineType, TimelineStatus } from '../../../../../common/api/timeline';
import { timelineActions, timelineSelectors } from '../../../store';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';

import * as i18n from './translations';
import { useCreateTimelineButton } from './use_create_timeline';
import { timelineDefaults } from '../../../store/defaults';
import { TIMELINE_TOUR_CONFIG_ANCHORS } from '../tour/step_config';

const NotesCountBadge = styled(EuiBadge)`
  margin-left: 5px;
` as unknown as typeof EuiBadge;

NotesCountBadge.displayName = 'NotesCountBadge';

interface AddToFavoritesButtonProps {
  timelineId: string;
  compact?: boolean;
}

const AddToFavoritesButtonComponent: React.FC<AddToFavoritesButtonProps> = ({
  timelineId,
  compact,
}) => {
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const isFavorite = useShallowEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).isFavorite
  );

  const status = useShallowEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).status
  );

  const disableFavoriteButton = status === TimelineStatus.immutable;

  const handleClick = useCallback(
    () => dispatch(timelineActions.updateIsFavorite({ id: timelineId, isFavorite: !isFavorite })),
    [dispatch, timelineId, isFavorite]
  );

  const label = isFavorite ? i18n.REMOVE_FROM_FAVORITES : i18n.ADD_TO_FAVORITES;

  return compact ? (
    <EuiButtonIcon
      id={TIMELINE_TOUR_CONFIG_ANCHORS.ADD_TO_FAVORITES}
      iconType={isFavorite ? 'starFilled' : 'starEmpty'}
      iconSize="m"
      isSelected={isFavorite}
      onClick={handleClick}
      data-test-subj={`timeline-favorite-${isFavorite ? 'filled' : 'empty'}-star`}
      disabled={disableFavoriteButton}
      aria-label={label}
      title={label}
    />
  ) : (
    <EuiButton
      id={TIMELINE_TOUR_CONFIG_ANCHORS.ADD_TO_FAVORITES}
      isSelected={isFavorite}
      fill={isFavorite}
      iconType={isFavorite ? 'starFilled' : 'starEmpty'}
      onClick={handleClick}
      data-test-subj={`timeline-favorite-${isFavorite ? 'filled' : 'empty'}-star`}
      disabled={disableFavoriteButton}
      aria-label={label}
      title={label}
    >
      {label}
    </EuiButton>
  );
};
AddToFavoritesButtonComponent.displayName = 'AddToFavoritesButtonComponent';

export const AddToFavoritesButton = React.memo(AddToFavoritesButtonComponent);

export interface NewTimelineProps {
  onClick?: () => void;
  outline?: boolean;
  timelineId: string;
  title?: string;
}

export const NewTimeline = React.memo<NewTimelineProps>(
  ({ onClick, outline = false, timelineId, title = i18n.NEW_TIMELINE }) => {
    const { getButton } = useCreateTimelineButton({
      timelineId,
      timelineType: TimelineType.default,
      onClick,
    });
    const button = getButton({ outline, title });

    return button;
  }
);
NewTimeline.displayName = 'NewTimeline';

interface NotesButtonProps {
  ariaLabel?: string;
  isDisabled?: boolean;
  showNotes: boolean;
  toggleShowNotes: () => void;
  toolTip?: string;
  timelineType: TimelineTypeLiteral;
}

interface SmallNotesButtonProps {
  ariaLabel?: string;
  isDisabled?: boolean;
  toggleShowNotes: () => void;
  timelineType: TimelineTypeLiteral;
}

export const NOTES_BUTTON_CLASS_NAME = 'notes-button';

const SmallNotesButton = React.memo<SmallNotesButtonProps>(
  ({ ariaLabel = i18n.NOTES, isDisabled, toggleShowNotes, timelineType }) => {
    const isTemplate = timelineType === TimelineType.template;

    return (
      <EuiButtonIcon
        aria-label={ariaLabel}
        className={NOTES_BUTTON_CLASS_NAME}
        data-test-subj="timeline-notes-button-small"
        disabled={isDisabled}
        iconType="editorComment"
        onClick={toggleShowNotes}
        size="s"
        isDisabled={isTemplate}
      />
    );
  }
);
SmallNotesButton.displayName = 'SmallNotesButton';

export const NotesButton = React.memo<NotesButtonProps>(
  ({ ariaLabel, isDisabled, showNotes, timelineType, toggleShowNotes, toolTip }) =>
    showNotes ? (
      <SmallNotesButton
        ariaLabel={ariaLabel}
        isDisabled={isDisabled}
        toggleShowNotes={toggleShowNotes}
        timelineType={timelineType}
      />
    ) : (
      <EuiToolTip content={toolTip || ''} data-test-subj="timeline-notes-tool-tip">
        <SmallNotesButton
          ariaLabel={ariaLabel}
          isDisabled={isDisabled}
          toggleShowNotes={toggleShowNotes}
          timelineType={timelineType}
        />
      </EuiToolTip>
    )
);
NotesButton.displayName = 'NotesButton';
