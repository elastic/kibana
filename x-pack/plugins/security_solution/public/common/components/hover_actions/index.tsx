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
import { allowTopN } from './utils';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { ColumnHeaderOptions, TimelineId } from '../../../../common/types/timeline';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererScope } from '../../containers/sourcerer';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { stopPropagationAndPreventDefault } from '../../../../../timelines/public';
import { ShowTopNButton } from './actions/show_top_n';
import { SHOW_TOP_N_KEYBOARD_SHORTCUT } from './keyboard_shortcut_constants';

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
  min-width: 138px;
  padding: ${(props) => `0 ${props.theme.eui.paddingSizes.s}`};
  display: flex;

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
    opacity: ${(props) => (props.$showTopN ? 1 : 0)};

    &:focus {
      opacity: 1;
    }
  }
`;

interface Props {
  additionalContent?: React.ReactNode;
  dataType?: string;
  draggableIds?: DraggableId[];
  field: string;
  goGetTimelineId?: (args: boolean) => void;
  isObjectArray: boolean;
  onFilterAdded?: () => void;
  ownFocus: boolean;
  showTopN: boolean;
  timelineId?: string | null;
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
    dataType,
    draggableIds,
    field,
    goGetTimelineId,
    isObjectArray,
    onFilterAdded,
    ownFocus,
    showTopN,
    timelineId,
    toggleColumn,
    toggleTopN,
    values,
  }) => {
    const kibana = useKibana();
    const { timelines } = kibana.services;
    // Common actions used by the alert table and alert flyout
    const {
      addToTimeline: {
        AddToTimelineButton,
        keyboardShortcut: addToTimelineKeyboardShortcut,
        useGetHandleStartDragToTimeline,
      },
      columnToggle: {
        ColumnToggleButton,
        columnToggleFn,
        keyboardShortcut: columnToggleKeyboardShortcut,
      },
      copy: { CopyButton, keyboardShortcut: copyKeyboardShortcut },
      filterForValue: {
        FilterForValueButton,
        filterForValueFn,
        keyboardShortcut: filterForValueKeyboardShortcut,
      },
      filterOutValue: {
        FilterOutValueButton,
        filterOutValueFn,
        keyboardShortcut: filterOutValueKeyboardShortcut,
      },
    } = timelines.getHoverActions();

    const filterManagerBackup = useMemo(() => kibana.services.data.query.filterManager, [
      kibana.services.data.query.filterManager,
    ]);
    const getManageTimeline = useMemo(() => timelineSelectors.getManageTimelineById(), []);
    const { filterManager: activeFilterMananager } = useDeepEqualSelector((state) =>
      getManageTimeline(state, timelineId ?? '')
    );
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

    const handleStartDragToTimeline = (() => {
      const handleStartDragToTimelineFns = draggableIds?.map((draggableId) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useGetHandleStartDragToTimeline({ draggableId, field });
      });
      return () => handleStartDragToTimelineFns?.forEach((dragFn) => dragFn());
    })();

    const handleFilterForValue = useCallback(() => {
      filterForValueFn({ field, value: values, filterManager, onFilterAdded });
    }, [filterForValueFn, field, values, filterManager, onFilterAdded]);

    const handleFilterOutValue = useCallback(() => {
      filterOutValueFn({ field, value: values, filterManager, onFilterAdded });
    }, [filterOutValueFn, field, values, filterManager, onFilterAdded]);

    const handleToggleColumn = useCallback(
      () => (toggleColumn ? columnToggleFn({ toggleColumn, field }) : null),
      [columnToggleFn, field, toggleColumn]
    );

    const isInit = useRef(true);
    const defaultFocusedButtonRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);

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
          case addToTimelineKeyboardShortcut:
            stopPropagationAndPreventDefault(keyboardEvent);
            handleStartDragToTimeline();
            break;
          case columnToggleKeyboardShortcut:
            stopPropagationAndPreventDefault(keyboardEvent);
            handleToggleColumn();
            break;
          case copyKeyboardShortcut:
            stopPropagationAndPreventDefault(keyboardEvent);
            const copyToClipboardButton = panelRef.current?.querySelector<HTMLButtonElement>(
              `.${COPY_TO_CLIPBOARD_BUTTON_CLASS_NAME}`
            );
            if (copyToClipboardButton != null) {
              copyToClipboardButton.click();
            }
            break;
          case filterForValueKeyboardShortcut:
            stopPropagationAndPreventDefault(keyboardEvent);
            handleFilterForValue();
            break;
          case filterOutValueKeyboardShortcut:
            stopPropagationAndPreventDefault(keyboardEvent);
            handleFilterOutValue();
            break;
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
            break;
        }
      },
      [
        addToTimelineKeyboardShortcut,
        columnToggleKeyboardShortcut,
        copyKeyboardShortcut,
        filterForValueKeyboardShortcut,
        filterOutValueKeyboardShortcut,
        handleFilterForValue,
        handleFilterOutValue,
        handleStartDragToTimeline,
        handleToggleColumn,
        ownFocus,
        toggleTopN,
      ]
    );

    const showFilters = values != null;

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
                data-test-subj="hover-actions-filter-for"
                defaultFocusedButtonRef={defaultFocusedButtonRef}
                field={field}
                onClick={handleFilterForValue}
                ownFocus={ownFocus}
                showTooltip
                value={values}
              />
              <FilterOutValueButton
                data-test-subj="hover-actions-filter-out"
                field={field}
                onClick={handleFilterOutValue}
                ownFocus={ownFocus}
                showTooltip
                value={values}
              />
            </>
          )}
          {toggleColumn && (
            <ColumnToggleButton
              data-test-subj="hover-actions-toggle-column"
              field={field}
              isDisabled={isObjectArray && dataType !== 'geo_point'}
              isObjectArray={isObjectArray}
              onClick={handleToggleColumn}
              ownFocus={ownFocus}
              value={values}
            />
          )}

          {showFilters && draggableIds != null && (
            <AddToTimelineButton
              data-test-subj="hover-actions-add-timeline"
              field={field}
              onClick={handleStartDragToTimeline}
              ownFocus={ownFocus}
              showTooltip
              value={values}
            />
          )}
          {allowTopN({
            browserField: getAllFieldsByName(browserFields)[field],
            fieldName: field,
          }) && (
            <ShowTopNButton
              data-test-subj="hover-actions-show-top-n"
              field={field}
              onClick={toggleTopN}
              onFilterAdded={onFilterAdded}
              ownFocus={ownFocus}
              showTopN={showTopN}
              timelineId={timelineId}
              value={values}
            />
          )}
          {showFilters && (
            <CopyButton
              data-test-subj="hover-actions-copy-button"
              field={field}
              isHoverAction
              ownFocus={ownFocus}
              showTooltip
              value={values}
            />
          )}
        </EuiFocusTrap>
      </StyledHoverActionsContainer>
    );
  }
);

HoverActions.displayName = 'HoverActions';
