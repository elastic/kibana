/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFocusTrap, EuiScreenReaderOnly } from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { DraggableId } from 'react-beautiful-dnd';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { getAllFieldsByName } from '../../containers/source';
import { COPY_TO_CLIPBOARD_BUTTON_CLASS_NAME } from '../../lib/clipboard/clipboard';
import { useKibana } from '../../lib/kibana';
import { createFilter } from '../add_filter_to_global_search_bar';
import { allowTopN } from './utils';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { TimelineId } from '../../../../common/types/timeline';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererScope } from '../../containers/sourcerer';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { stopPropagationAndPreventDefault } from '../../../../../timelines/public';
import { FilterForValueButton } from './actions/filter_for_value';
import { FilterOutValueButton } from './actions/filter_out_value';
import { AddToTimelineButton } from './actions/add_to_timeline';
import { ShowTopNButton } from './actions/show_top_n';
import { CopyButton } from './actions/copy';
import {
  FILTER_FOR_VALUE_KEYBOARD_SHORTCUT,
  FILTER_OUT_VALUE_KEYBOARD_SHORTCUT,
  ADD_TO_TIMELINE_KEYBOARD_SHORTCUT,
  SHOW_TOP_N_KEYBOARD_SHORTCUT,
  COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT,
} from './keyboard_shortcut_constants';

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

const StyledHoverActionsContainer = styled.div<{ $showTopN: boolean }>`
  padding: ${(props) => (props.$showTopN ? 'none' : props.theme.eui.paddingSizes.s)};

  &:focus-within {
    .securitySolution__hoverActionButton {
      opacity: 1;
    }
  }

  &:hover {
    .securitySolution__hoverActionButton {
      opacity: 1;
    }
  }

  .securitySolution__hoverActionButton {
    // TODO: Using this logic from discover
    /* @include euiBreakpoint('m', 'l', 'xl') {
      opacity: 0;
    } */
    opacity: 0;

    &:focus {
      opacity: 1;
    }
  }
`;

interface Props {
  additionalContent?: React.ReactNode;
  draggableId?: DraggableId;
  field: string;
  goGetTimelineId?: (args: boolean) => void;
  onFilterAdded?: () => void;
  ownFocus: boolean;
  showTopN: boolean;
  timelineId?: string | null;
  toggleTopN: () => void;
  value?: string[] | string | null;
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
    draggableId,
    field,
    goGetTimelineId,
    onFilterAdded,
    ownFocus,
    showTopN,
    timelineId,
    toggleTopN,
    value,
  }) => {
    const kibana = useKibana();
    const { timelines } = kibana.services;
    const { startDragToTimeline } = timelines.getUseAddToTimeline()({
      draggableId,
      fieldName: field,
    });
    const filterManagerBackup = useMemo(() => kibana.services.data.query.filterManager, [
      kibana.services.data.query.filterManager,
    ]);
    const getManageTimeline = useMemo(() => timelineSelectors.getManageTimelineById(), []);
    const { filterManager: activeFilterMananager } = useDeepEqualSelector((state) =>
      getManageTimeline(state, timelineId ?? '')
    );
    const defaultFocusedButtonRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);

    const filterManager = useMemo(
      () => (timelineId === TimelineId.active ? activeFilterMananager : filterManagerBackup),
      [timelineId, activeFilterMananager, filterManagerBackup]
    );

    //  Regarding data from useManageTimeline:
    //  * `indexToAdd`, which enables the alerts index to be appended to
    //    the `indexPattern` returned by `useWithSource`, may only be populated when
    //    this component is rendered in the context of the active timeline. This
    //    behavior enables the 'All events' view by appending the alerts index
    //    to the index pattern.
    const activeScope: SourcererScopeName =
      timelineId === TimelineId.active
        ? SourcererScopeName.timeline
        : timelineId != null &&
          [TimelineId.detectionsPage, TimelineId.detectionsRulesDetailsPage].includes(
            timelineId as TimelineId
          )
        ? SourcererScopeName.detections
        : SourcererScopeName.default;
    const { browserFields } = useSourcererScope(activeScope);
    const handleStartDragToTimeline = useCallback(() => {
      startDragToTimeline();
    }, [startDragToTimeline]);

    const filterForValue = useCallback(() => {
      const filter =
        value?.length === 0 ? createFilter(field, undefined) : createFilter(field, value);
      const activeFilterManager = filterManager;

      if (activeFilterManager != null) {
        activeFilterManager.addFilters(filter);
        if (onFilterAdded != null) {
          onFilterAdded();
        }
      }
    }, [field, value, filterManager, onFilterAdded]);

    const filterOutValue = useCallback(() => {
      const filter =
        value?.length === 0 ? createFilter(field, null, false) : createFilter(field, value, true);
      const activeFilterManager = filterManager;

      if (activeFilterManager != null) {
        activeFilterManager.addFilters(filter);
        if (onFilterAdded != null) {
          onFilterAdded();
        }
      }
    }, [field, value, filterManager, onFilterAdded]);

    const isInit = useRef(true);

    useEffect(() => {
      if (isInit.current && goGetTimelineId != null && timelineId == null) {
        isInit.current = false;
        goGetTimelineId(true);
      }
    }, [goGetTimelineId, timelineId]);

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
          case FILTER_FOR_VALUE_KEYBOARD_SHORTCUT:
            stopPropagationAndPreventDefault(keyboardEvent);
            filterForValue();
            break;
          case FILTER_OUT_VALUE_KEYBOARD_SHORTCUT:
            stopPropagationAndPreventDefault(keyboardEvent);
            filterOutValue();
            break;
          case ADD_TO_TIMELINE_KEYBOARD_SHORTCUT:
            stopPropagationAndPreventDefault(keyboardEvent);
            handleStartDragToTimeline();
            break;
          case SHOW_TOP_N_KEYBOARD_SHORTCUT:
            stopPropagationAndPreventDefault(keyboardEvent);
            toggleTopN();
            break;
          case COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT:
            stopPropagationAndPreventDefault(keyboardEvent);
            const copyToClipboardButton = panelRef.current?.querySelector<HTMLButtonElement>(
              `.${COPY_TO_CLIPBOARD_BUTTON_CLASS_NAME}`
            );
            if (copyToClipboardButton != null) {
              copyToClipboardButton.click();
            }
            break;
          case 'Enter':
            break;
          case 'Escape':
            stopPropagationAndPreventDefault(keyboardEvent);
            break;
          default:
            break;
        }
      },

      [filterForValue, filterOutValue, handleStartDragToTimeline, ownFocus, toggleTopN]
    );

    const showFilters = !showTopN && value != null;

    return (
      <StyledHoverActionsContainer onKeyDown={onKeyDown} ref={panelRef} $showTopN={showTopN}>
        <EuiFocusTrap
          disabled={isFocusTrapDisabled({
            ownFocus,
            showTopN,
          })}
        >
          <EuiScreenReaderOnly>
            <p>{YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS(field)}</p>
          </EuiScreenReaderOnly>

          {additionalContent != null && <AdditionalContent>{additionalContent}</AdditionalContent>}

          {showFilters && (
            <>
              <FilterForValueButton
                defaultFocusedButtonRef={defaultFocusedButtonRef}
                field={field}
                onClick={filterForValue}
                ownFocus={ownFocus}
                value={value}
              />
              <FilterOutValueButton
                field={field}
                onClick={filterOutValue}
                ownFocus={ownFocus}
                value={value}
              />
            </>
          )}

          {showFilters && draggableId != null && (
            <AddToTimelineButton
              field={field}
              onClick={handleStartDragToTimeline}
              ownFocus={ownFocus}
              value={value}
            />
          )}
          {allowTopN({
            browserField: getAllFieldsByName(browserFields)[field],
            fieldName: field,
          }) && (
            <ShowTopNButton
              field={field}
              onClick={toggleTopN}
              onFilterAdded={onFilterAdded}
              ownFocus={ownFocus}
              showTopN={showTopN}
              timelineId={timelineId}
              value={value}
            />
          )}
          {!showTopN && (
            <CopyButton field={field} ownFocus={ownFocus} value={value} isHoverAction />
          )}
        </EuiFocusTrap>
      </StyledHoverActionsContainer>
    );
  }
);

HoverActions.displayName = 'HoverActions';
