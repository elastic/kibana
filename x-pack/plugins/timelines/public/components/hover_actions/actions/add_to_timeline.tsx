/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { DraggableId } from 'react-beautiful-dnd';
import { useDispatch } from 'react-redux';

import { isEmpty } from 'lodash';
import { DataProvider, stopPropagationAndPreventDefault, TimelineId } from '../../../../common';
import { TooltipWithKeyboardShortcut } from '../../tooltip_with_keyboard_shortcut';
import { getAdditionalScreenReaderOnlyContext } from '../utils';
import { useAddToTimeline } from '../../../hooks/use_add_to_timeline';
import { HoverActionComponentProps } from './types';
import { tGridActions } from '../../..';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import * as i18n from './translations';

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
  draggableId?: DraggableId;
  dataProvider?: DataProvider[] | DataProvider;
}

const AddToTimelineButton: React.FC<AddToTimelineButtonProps> = React.memo(
  ({
    closePopOver,
    dataProvider,
    defaultFocusedButtonRef,
    draggableId,
    field,
    keyboardEvent,
    ownFocus,
    showTooltip = false,
    value,
  }) => {
    const dispatch = useDispatch();
    const { addSuccess } = useAppToasts();
    const startDragToTimeline = useGetHandleStartDragToTimeline({ draggableId, field });
    const handleStartDragToTimeline = useCallback(() => {
      if (draggableId != null) {
        startDragToTimeline();
      } else if (!isEmpty(dataProvider)) {
        const addDataProvider = Array.isArray(dataProvider) ? dataProvider : [dataProvider];
        addDataProvider.forEach((provider) => {
          if (provider) {
            dispatch(
              tGridActions.addProviderToTimeline({
                id: TimelineId.active,
                dataProvider: provider,
              })
            );
            addSuccess(i18n.ADDED_TO_TIMELINE_MESSAGE(provider.name));
          }
        });
      }

      if (closePopOver != null) {
        closePopOver();
      }
    }, [addSuccess, closePopOver, dataProvider, dispatch, draggableId, startDragToTimeline]);

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
            content={i18n.ADD_TO_TIMELINE}
            shortcut={ADD_TO_TIMELINE_KEYBOARD_SHORTCUT}
            showShortcut={ownFocus}
          />
        }
      >
        <EuiButtonIcon
          aria-label={i18n.ADD_TO_TIMELINE}
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
        aria-label={i18n.ADD_TO_TIMELINE}
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
