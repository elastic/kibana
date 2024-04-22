/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { State } from '../../../common/store';
import { selectTimelineById } from '../../store/selectors';
import { timelineActions } from '../../store';
import { TimelineStatus } from '../../../../common/api/timeline';
import { TIMELINE_TOUR_CONFIG_ANCHORS } from '../timeline/tour/step_config';

const ADD_TO_FAVORITES = i18n.translate(
  'xpack.securitySolution.timeline.addToFavoriteButtonLabel',
  {
    defaultMessage: 'Add to favorites',
  }
);

const REMOVE_FROM_FAVORITES = i18n.translate(
  'xpack.securitySolution.timeline.removeFromFavoritesButtonLabel',
  {
    defaultMessage: 'Remove from favorites',
  }
);

interface AddToFavoritesButtonProps {
  /**
   * Id of the timeline to be displayed in the bottom bar and within the modal
   */
  timelineId: string;
  /**
   * Whether the button is a step in the timeline guided tour
   */
  isPartOfGuidedTour?: boolean;
}

/**
 * This component renders the add to favorites button for timeline.
 * It is used in the bottom bar as well as in the timeline modal's header.
 */
export const AddToFavoritesButton = React.memo<AddToFavoritesButtonProps>(
  ({ timelineId, isPartOfGuidedTour = false }) => {
    const dispatch = useDispatch();
    const { isFavorite, status } = useSelector((state: State) =>
      selectTimelineById(state, timelineId)
    );

    const isTimelineDraftOrImmutable = status !== TimelineStatus.active;
    const label = isFavorite ? REMOVE_FROM_FAVORITES : ADD_TO_FAVORITES;

    const handleClick = useCallback(
      () => dispatch(timelineActions.updateIsFavorite({ id: timelineId, isFavorite: !isFavorite })),
      [dispatch, timelineId, isFavorite]
    );

    return (
      <EuiButtonIcon
        id={isPartOfGuidedTour ? TIMELINE_TOUR_CONFIG_ANCHORS.ADD_TO_FAVORITES : undefined}
        iconType={isFavorite ? 'starFilled' : 'starEmpty'}
        isSelected={isFavorite}
        disabled={isTimelineDraftOrImmutable}
        aria-label={label}
        title={label}
        data-test-subj={`timeline-favorite-${isFavorite ? 'filled' : 'empty'}-star`}
        onClick={handleClick}
      >
        {label}
      </EuiButtonIcon>
    );
  }
);

AddToFavoritesButton.displayName = 'AddToFavoritesButton';
