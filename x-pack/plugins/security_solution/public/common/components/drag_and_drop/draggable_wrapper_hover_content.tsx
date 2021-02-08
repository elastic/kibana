/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFocusTrap,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { DraggableId } from 'react-beautiful-dnd';
import styled from 'styled-components';

import { stopPropagationAndPreventDefault } from '../accessibility/helpers';
import { TooltipWithKeyboardShortcut } from '../accessibility/tooltip_with_keyboard_shortcut';
import { getAllFieldsByName } from '../../containers/source';
import { useAddToTimeline } from '../../hooks/use_add_to_timeline';
import { COPY_TO_CLIPBOARD_BUTTON_CLASS_NAME } from '../../lib/clipboard/clipboard';
import { WithCopyToClipboard } from '../../lib/clipboard/with_copy_to_clipboard';
import { useKibana } from '../../lib/kibana';
import { createFilter } from '../add_filter_to_global_search_bar';
import { StatefulTopN } from '../top_n';

import { allowTopN } from './helpers';
import * as i18n from './translations';
import { useManageTimeline } from '../../../timelines/components/manage_timeline';
import { TimelineId } from '../../../../common/types/timeline';
import { SELECTOR_TIMELINE_GLOBAL_CONTAINER } from '../../../timelines/components/timeline/styles';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererScope } from '../../containers/sourcerer';

export const AdditionalContent = styled.div`
  padding: 2px;
`;

AdditionalContent.displayName = 'AdditionalContent';

const getAdditionalScreenReaderOnlyContext = ({
  field,
  value,
}: {
  field: string;
  value?: string[] | string | null;
}): string => {
  if (value == null) {
    return field;
  }

  return Array.isArray(value) ? `${field} ${value.join(' ')}` : `${field} ${value}`;
};

const FILTER_FOR_VALUE_KEYBOARD_SHORTCUT = 'f';
const FILTER_OUT_VALUE_KEYBOARD_SHORTCUT = 'o';
const ADD_TO_TIMELINE_KEYBOARD_SHORTCUT = 'a';
const SHOW_TOP_N_KEYBOARD_SHORTCUT = 't';
const COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT = 'c';

interface Props {
  additionalContent?: React.ReactNode;
  closePopOver?: () => void;
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

const DraggableWrapperHoverContentComponent: React.FC<Props> = ({
  additionalContent = null,
  closePopOver,
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
  const { startDragToTimeline } = useAddToTimeline({ draggableId, fieldName: field });
  const kibana = useKibana();
  const filterManagerBackup = useMemo(() => kibana.services.data.query.filterManager, [
    kibana.services.data.query.filterManager,
  ]);
  const { getTimelineFilterManager } = useManageTimeline();
  const defaultFocusedButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const filterManager = useMemo(
    () =>
      timelineId === TimelineId.active
        ? getTimelineFilterManager(TimelineId.active)
        : filterManagerBackup,
    [timelineId, getTimelineFilterManager, filterManagerBackup]
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
  const { browserFields, indexPattern, selectedPatterns } = useSourcererScope(activeScope);
  const indexNames: string[] = useMemo(() => selectedPatterns.map(({ title }) => title), [
    selectedPatterns,
  ]);
  const handleStartDragToTimeline = useCallback(() => {
    startDragToTimeline();
    if (closePopOver != null) {
      closePopOver();
    }
  }, [closePopOver, startDragToTimeline]);

  const filterForValue = useCallback(() => {
    const filter =
      value?.length === 0 ? createFilter(field, undefined) : createFilter(field, value);
    const activeFilterManager = filterManager;

    if (activeFilterManager != null) {
      activeFilterManager.addFilters(filter);
      if (closePopOver != null) {
        closePopOver();
      }
      if (onFilterAdded != null) {
        onFilterAdded();
      }
    }
  }, [closePopOver, field, value, filterManager, onFilterAdded]);

  const filterOutValue = useCallback(() => {
    const filter =
      value?.length === 0 ? createFilter(field, null, false) : createFilter(field, value, true);
    const activeFilterManager = filterManager;

    if (activeFilterManager != null) {
      activeFilterManager.addFilters(filter);

      if (closePopOver != null) {
        closePopOver();
      }
      if (onFilterAdded != null) {
        onFilterAdded();
      }
    }
  }, [closePopOver, field, value, filterManager, onFilterAdded]);

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
            if (closePopOver != null) {
              closePopOver();
            }
          }
          break;
        case 'Enter':
          break;
        case 'Escape':
          stopPropagationAndPreventDefault(keyboardEvent);
          if (closePopOver != null) {
            closePopOver();
          }
          break;
        default:
          break;
      }
    },

    [closePopOver, filterForValue, filterOutValue, handleStartDragToTimeline, ownFocus, toggleTopN]
  );

  return (
    <EuiPanel onKeyDown={onKeyDown} paddingSize={showTopN ? 'none' : 's'} panelRef={panelRef}>
      <EuiFocusTrap
        disabled={isFocusTrapDisabled({
          ownFocus,
          showTopN,
        })}
      >
        <EuiScreenReaderOnly>
          <p>{i18n.YOU_ARE_IN_A_DIALOG_CONTAINING_OPTIONS(field)}</p>
        </EuiScreenReaderOnly>

        {additionalContent != null && <AdditionalContent>{additionalContent}</AdditionalContent>}

        {!showTopN && value != null && (
          <EuiToolTip
            content={
              <TooltipWithKeyboardShortcut
                additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
                  field,
                  value,
                })}
                content={i18n.FILTER_FOR_VALUE}
                shortcut={FILTER_FOR_VALUE_KEYBOARD_SHORTCUT}
                showShortcut={ownFocus}
              />
            }
          >
            <EuiButtonIcon
              aria-label={i18n.FILTER_FOR_VALUE}
              buttonRef={defaultFocusedButtonRef}
              color="text"
              data-test-subj="filter-for-value"
              iconType="magnifyWithPlus"
              onClick={filterForValue}
            />
          </EuiToolTip>
        )}

        {!showTopN && value != null && (
          <EuiToolTip
            content={
              <TooltipWithKeyboardShortcut
                additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
                  field,
                  value,
                })}
                content={i18n.FILTER_OUT_VALUE}
                shortcut={FILTER_OUT_VALUE_KEYBOARD_SHORTCUT}
                showShortcut={ownFocus}
              />
            }
          >
            <EuiButtonIcon
              aria-label={i18n.FILTER_OUT_VALUE}
              color="text"
              data-test-subj="filter-out-value"
              iconType="magnifyWithMinus"
              onClick={filterOutValue}
            />
          </EuiToolTip>
        )}

        {!showTopN && value != null && draggableId != null && (
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
              color="text"
              data-test-subj="add-to-timeline"
              iconType="timeline"
              onClick={handleStartDragToTimeline}
            />
          </EuiToolTip>
        )}

        <>
          {allowTopN({
            browserField: getAllFieldsByName(browserFields)[field],
            fieldName: field,
          }) && (
            <>
              {!showTopN && (
                <EuiToolTip
                  content={
                    <TooltipWithKeyboardShortcut
                      additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
                        field,
                        value,
                      })}
                      content={i18n.SHOW_TOP(field)}
                      shortcut={SHOW_TOP_N_KEYBOARD_SHORTCUT}
                      showShortcut={ownFocus}
                    />
                  }
                >
                  <EuiButtonIcon
                    aria-label={i18n.SHOW_TOP(field)}
                    color="text"
                    data-test-subj="show-top-field"
                    iconType="visBarVertical"
                    onClick={toggleTopN}
                  />
                </EuiToolTip>
              )}

              {showTopN && (
                <StatefulTopN
                  browserFields={browserFields}
                  field={field}
                  indexPattern={indexPattern}
                  indexNames={indexNames}
                  onFilterAdded={onFilterAdded}
                  timelineId={timelineId ?? undefined}
                  toggleTopN={toggleTopN}
                  value={value}
                />
              )}
            </>
          )}
        </>

        {!showTopN && (
          <WithCopyToClipboard
            data-test-subj="copy-to-clipboard"
            keyboardShortcut={ownFocus ? COPY_TO_CLIPBOARD_KEYBOARD_SHORTCUT : ''}
            text={`${field}${value != null ? `: "${value}"` : ''}`}
            titleSummary={i18n.FIELD}
          />
        )}
      </EuiFocusTrap>
    </EuiPanel>
  );
};

DraggableWrapperHoverContentComponent.displayName = 'DraggableWrapperHoverContentComponent';

export const DraggableWrapperHoverContent = React.memo(DraggableWrapperHoverContentComponent);

export const useGetTimelineId = function (
  elem: React.MutableRefObject<Element | null>,
  getTimelineId: boolean = false
) {
  const [timelineId, setTimelineId] = useState<string | null>(null);

  useEffect(() => {
    let startElem: Element | (Node & ParentNode) | null = elem.current;
    if (startElem != null && getTimelineId) {
      for (; startElem && startElem !== document; startElem = startElem.parentNode) {
        const myElem: Element = startElem as Element;
        if (
          myElem != null &&
          myElem.classList != null &&
          myElem.classList.contains(SELECTOR_TIMELINE_GLOBAL_CONTAINER) &&
          myElem.hasAttribute('data-timeline-id')
        ) {
          setTimelineId(myElem.getAttribute('data-timeline-id'));
          break;
        }
      }
    }
  }, [elem, getTimelineId]);

  return timelineId;
};
