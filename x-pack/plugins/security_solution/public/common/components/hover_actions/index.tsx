/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFocusTrap, EuiScreenReaderOnly } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DraggableId } from '@hello-pangea/dnd';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';

import { stopPropagationAndPreventDefault } from '@kbn/timelines-plugin/public';
import type { ColumnHeaderOptions, DataProvider } from '../../../../common/types/timeline';
import { TimelineId } from '../../../../common/types/timeline';
import { SHOW_TOP_N_KEYBOARD_SHORTCUT } from './keyboard_shortcut_constants';
import { useHoverActionItems } from './use_hover_action_items';
import { SecurityPageName } from '../../../app/types';

export const YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS = (fieldName: string) =>
  i18n.translate(
    'xpack.securitySolution.dragAndDrop.youAreInADialogContainingOptionsScreenReaderOnly',
    {
      values: { fieldName },
      defaultMessage: `You are in a dialog, containing options for field {fieldName}. Press tab to navigate options. Press escape to exit.`,
    }
  );

export const AdditionalContent = styled.div`
  padding: 2px;
`;

AdditionalContent.displayName = 'AdditionalContent';

const StyledHoverActionsContainer = styled.div<{
  $showTopN: boolean;
  $showOwnFocus: boolean;
  $hiddenActionsCount: number;
  $isActive: boolean;
}>`
  display: flex;

  ${(props) =>
    props.$isActive
      ? `
    .hoverActions-active {
      .timelines__hoverActionButton,
      .securitySolution__hoverActionButton {
        opacity: 1;
      }
    }
  `
      : ''}

  ${(props) =>
    props.$showOwnFocus
      ? `
    &:focus-within {
      .timelines__hoverActionButton,
      .securitySolution__hoverActionButton {
        opacity: 1;
      }
    }

    &:hover {
      .timelines__hoverActionButton,
      .securitySolution__hoverActionButton {
        opacity: 1;
      }
    }

  .timelines__hoverActionButton,
  .securitySolution__hoverActionButton {
    opacity: ${props.$showTopN ? 1 : 0};

      &:focus {
        opacity: 1;
      }
    }
  `
      : ''}
`;

const StyledHoverActionsContainerWithPaddingsAndMinWidth = styled(StyledHoverActionsContainer)`
  min-width: ${({ $hiddenActionsCount }) => `${138 - $hiddenActionsCount * 26}px`};
  padding: ${(props) => `0 ${props.theme.eui.euiSizeS}`};
  position: relative;
`;

interface Props {
  additionalContent?: React.ReactNode;
  applyWidthAndPadding?: boolean;
  closeTopN?: () => void;
  closePopOver?: () => void;
  dataProvider?: DataProvider | DataProvider[];
  dataType?: string;
  draggableId?: DraggableId;
  enableOverflowButton?: boolean;
  field: string;
  fieldType: string;
  isAggregatable: boolean;
  goGetTimelineId?: (args: boolean) => void;
  hideAddToTimeline?: boolean;
  hideTopN?: boolean;
  isObjectArray: boolean;
  onFilterAdded?: () => void;
  ownFocus: boolean;
  showOwnFocus?: boolean;
  showTopN: boolean;
  scopeId?: string | null;
  toggleColumn?: (column: ColumnHeaderOptions) => void;
  toggleTopN: () => void;
  values?: string[] | string | null;
}

/** Returns a value for the `disabled` prop of `EuiFocusTrap` */
const isFocusTrapDisabled = ({
  ownFocus,
  showTopN,
}: {
  ownFocus: boolean;
  showTopN: boolean;
}): boolean => {
  if (showTopN) {
    return false; // we *always* want to trap focus when showing Top N
  }

  return !ownFocus;
};

export const HoverActions: React.FC<Props> = React.memo(
  ({
    additionalContent = null,
    closePopOver,
    closeTopN,
    dataProvider,
    dataType,
    draggableId,
    enableOverflowButton = false,
    applyWidthAndPadding = true,
    field,
    fieldType,
    isAggregatable,
    goGetTimelineId,
    isObjectArray,
    hideAddToTimeline = false,
    hideTopN = false,
    onFilterAdded,
    ownFocus,
    showOwnFocus = true,
    showTopN,
    scopeId,
    toggleColumn,
    toggleTopN,
    values,
  }) => {
    const [stKeyboardEvent, setStKeyboardEvent] = useState<React.KeyboardEvent>();
    const [isActive, setIsActive] = useState(false);
    const [isOverflowPopoverOpen, setIsOverflowPopoverOpen] = useState(false);
    const onOverflowButtonClick = useCallback(() => {
      setIsActive((prev) => !prev);
      setIsOverflowPopoverOpen(!isOverflowPopoverOpen);
    }, [isOverflowPopoverOpen, setIsOverflowPopoverOpen]);
    const handleHoverActionClicked = useCallback(() => {
      if (closeTopN) {
        closeTopN();
      }

      setIsActive(false);
      setIsOverflowPopoverOpen(false);
      if (closePopOver) {
        closePopOver();
      }
    }, [closePopOver, closeTopN]);

    const isInit = useRef(true);
    const defaultFocusedButtonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
      if (isInit.current && goGetTimelineId != null && scopeId == null) {
        isInit.current = false;
        goGetTimelineId(true);
      }
    }, [goGetTimelineId, scopeId]);

    useEffect(() => {
      if (ownFocus) {
        setTimeout(() => {
          defaultFocusedButtonRef.current?.focus();
        }, 0);
      }
    }, [ownFocus]);

    const onKeyDown = useCallback(
      (keyboardEvent: React.KeyboardEvent) => {
        if (!ownFocus) {
          return;
        }
        switch (keyboardEvent.key) {
          case SHOW_TOP_N_KEYBOARD_SHORTCUT:
            stopPropagationAndPreventDefault(keyboardEvent);
            toggleTopN();
            break;
          case 'Enter':
            break;
          case 'Escape':
            stopPropagationAndPreventDefault(keyboardEvent);
            break;
          default:
            setStKeyboardEvent(keyboardEvent);
            break;
        }
      },
      [ownFocus, toggleTopN]
    );

    const isCaseView = scopeId === TimelineId.casePage;
    const isTimelineView = scopeId === TimelineId.active;
    const isAlertDetailsView = scopeId === TimelineId.detectionsAlertDetailsPage;
    // TODO Provide a list of disabled/enabled actions as props
    const isEntityAnalyticsPage = scopeId === SecurityPageName.entityAnalytics;

    const hideFilters = useMemo(
      () => (isAlertDetailsView || isEntityAnalyticsPage) && !isTimelineView,
      [isTimelineView, isAlertDetailsView, isEntityAnalyticsPage]
    );

    const hiddenActionsCount = useMemo(() => {
      const hiddenTopNActions = hideTopN ? 1 : 0; // hides the `Top N` button
      const hiddenFilterActions = hideFilters ? 2 : 0; // hides both the `Filter In` and `Filter out` buttons

      return hiddenTopNActions + hiddenFilterActions;
    }, [hideFilters, hideTopN]);

    const { overflowActionItems, allActionItems } = useHoverActionItems({
      dataProvider,
      dataType,
      defaultFocusedButtonRef,
      draggableId,
      enableOverflowButton: enableOverflowButton && !isCaseView,
      field,
      fieldType,
      hideFilters,
      isAggregatable,
      handleHoverActionClicked,
      hideAddToTimeline,
      hideTopN,
      isCaseView,
      isObjectArray,
      isOverflowPopoverOpen,
      onFilterAdded,
      onOverflowButtonClick,
      ownFocus,
      showTopN,
      stKeyboardEvent,
      toggleColumn,
      toggleTopN,
      values,
      scopeId,
    });

    const Container = applyWidthAndPadding
      ? StyledHoverActionsContainerWithPaddingsAndMinWidth
      : StyledHoverActionsContainer;

    return (
      <EuiFocusTrap
        disabled={isFocusTrapDisabled({
          ownFocus,
          showTopN,
        })}
      >
        <Container
          data-test-subj="hover-actions-container"
          onKeyDown={onKeyDown}
          $showTopN={showTopN}
          $showOwnFocus={showOwnFocus}
          $hiddenActionsCount={hiddenActionsCount}
          $isActive={isActive}
          className={isActive ? 'hoverActions-active' : ''}
        >
          <EuiScreenReaderOnly>
            <p>{YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS(field)}</p>
          </EuiScreenReaderOnly>

          {additionalContent != null && <AdditionalContent>{additionalContent}</AdditionalContent>}

          {enableOverflowButton && !isCaseView ? overflowActionItems : allActionItems}
        </Container>
      </EuiFocusTrap>
    );
  }
);

HoverActions.displayName = 'HoverActions';
