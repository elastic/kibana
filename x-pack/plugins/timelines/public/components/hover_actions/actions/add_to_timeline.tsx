/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DraggableId } from 'react-beautiful-dnd';

import { stopPropagationAndPreventDefault } from '../../../../common';
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

const useGetHandleStartDragToTimeline = ({
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

export interface AddToTimelineButtonProps extends HoverActionComponentProps {
  draggableIds?: DraggableId[];
}

const AddToTimelineButton: React.FC<AddToTimelineButtonProps> = React.memo(
  ({
    defaultFocusedButtonRef,
    draggableIds,
    field,
    keyboardEvent,
    ownFocus,
    showTooltip = false,
    value,
  }) => {
    const handleStartDragToTimeline = (() => {
      const handleStartDragToTimelineFns = draggableIds?.map((draggableId) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useGetHandleStartDragToTimeline({ draggableId, field });
      });
      return () => handleStartDragToTimelineFns?.forEach((dragFn) => dragFn());
    })();

    useEffect(() => {
      if (!ownFocus) {
        return;
      }
      if (keyboardEvent?.key === ADD_TO_TIMELINE_KEYBOARD_SHORTCUT) {
        stopPropagationAndPreventDefault(keyboardEvent);
        handleStartDragToTimeline();
      }
    }, [handleStartDragToTimeline, keyboardEvent, ownFocus]);

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
          buttonRef={defaultFocusedButtonRef}
          className="timelines__hoverActionButton"
          data-test-subj="add-to-timeline"
          iconSize="s"
          iconType="timeline"
          onClick={handleStartDragToTimeline}
        />
      </EuiToolTip>
    ) : (
      <EuiButtonIcon
        aria-label={ADD_TO_TIMELINE}
        buttonRef={defaultFocusedButtonRef}
        className="timelines__hoverActionButton"
        data-test-subj="add-to-timeline"
        iconSize="s"
        iconType="timeline"
        onClick={handleStartDragToTimeline}
      />
    );
  }
);

AddToTimelineButton.displayName = 'AddToTimelineButton';

// eslint-disable-next-line import/no-default-export
export { AddToTimelineButton as default };
