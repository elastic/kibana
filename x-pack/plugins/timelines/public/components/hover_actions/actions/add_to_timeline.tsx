/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DraggableId } from 'react-beautiful-dnd';
import { TooltipWithKeyboardShortcut } from '../../tooltip_with_keyboard_shortcut';
import { getAdditionalScreenReaderOnlyContext } from '../utils';
import { useAddToTimeline } from '../../../hooks/use_add_to_timeline';
import { HoverActionComponentProps } from './types';

const ADD_TO_TIMELINE = i18n.translate('xpack.timelines.hoverActions.addToTimeline', {
  defaultMessage: 'Add to timeline investigation',
});

export const ADD_TO_TIMELINE_KEYBOARD_SHORTCUT = 'a';

export interface UseGetHandleStartDragToTimelineArgs {
  field: string;
  draggableId: DraggableId | undefined;
}

export const useGetHandleStartDragToTimeline = ({
  field,
  draggableId,
}: UseGetHandleStartDragToTimelineArgs): (() => void) => {
  const { startDragToTimeline } = useAddToTimeline({
    draggableId,
    fieldName: field,
  });

  const handleStartDragToTimeline = useCallback(() => {
    startDragToTimeline();
  }, [startDragToTimeline]);

  return handleStartDragToTimeline;
};

export const AddToTimelineButton: React.FC<HoverActionComponentProps> = React.memo(
  ({ field, onClick, ownFocus, showTooltip = false, value }) => {
    return showTooltip ? (
      <EuiToolTip
        content={
          <TooltipWithKeyboardShortcut
            additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
              field,
              value,
            })}
            content={ADD_TO_TIMELINE}
            shortcut={ADD_TO_TIMELINE_KEYBOARD_SHORTCUT}
            showShortcut={ownFocus}
          />
        }
      >
        <EuiButtonIcon
          aria-label={ADD_TO_TIMELINE}
          className="timelines__hoverActionButton"
          data-test-subj="add-to-timeline"
          iconSize="s"
          iconType="timeline"
          onClick={onClick}
        />
      </EuiToolTip>
    ) : (
      <EuiButtonIcon
        aria-label={ADD_TO_TIMELINE}
        className="timelines__hoverActionButton"
        data-test-subj="add-to-timeline"
        iconSize="s"
        iconType="timeline"
        onClick={onClick}
      />
    );
  }
);

AddToTimelineButton.displayName = 'AddToTimelineButton';
