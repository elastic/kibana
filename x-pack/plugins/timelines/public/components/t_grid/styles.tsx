/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME } from '@kbn/securitysolution-t-grid';
import { rgba } from 'polished';
import styled, { createGlobalStyle } from 'styled-components';
import type { TimelineEventsType } from '../../../common/types/timeline';
import type { ViewSelection } from './event_rendered_view/selector';

import { ACTIONS_COLUMN_ARIA_COL_INDEX } from './helpers';
import { EVENTS_TABLE_ARIA_LABEL } from './translations';

/**
 * TIMELINE BODY
 */
export const SELECTOR_TIMELINE_GLOBAL_CONTAINER = 'securitySolutionTimeline__container';
export const TimelineContainer = styled.div.attrs(({ className = '' }) => ({
  className: `${SELECTOR_TIMELINE_GLOBAL_CONTAINER} ${className}`,
}))`
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
`;

/**
 * TIMELINE BODY
 */
export const SELECTOR_TIMELINE_BODY_CLASS_NAME = 'securitySolutionTimeline__body';

// SIDE EFFECT: the following creates a global class selector
export const TimelineBodyGlobalStyle = createGlobalStyle`
  body.${IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME} .${SELECTOR_TIMELINE_BODY_CLASS_NAME} {
    overflow: hidden;
  }
`;

export const TimelineBody = styled.div.attrs(({ className = '' }) => ({
  className: `${SELECTOR_TIMELINE_BODY_CLASS_NAME} ${className}`,
}))`
  height: auto;
  overflow: auto;
  scrollbar-width: thin;
  flex: 1;
  display: block;

  &::-webkit-scrollbar {
    height: ${({ theme }) => theme.eui.euiScrollBar};
    width: ${({ theme }) => theme.eui.euiScrollBar};
  }

  &::-webkit-scrollbar-thumb {
    background-clip: content-box;
    background-color: ${({ theme }) => rgba(theme.eui.euiColorDarkShade, 0.5)};
    border: ${({ theme }) => theme.eui.euiScrollBarCorner} solid transparent;
  }

  &::-webkit-scrollbar-corner,
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;
TimelineBody.displayName = 'TimelineBody';

/**
 * EVENTS TABLE
 */

export const EVENTS_TABLE_CLASS_NAME = 'siemEventsTable';
export const EVENTS_TABLE_HEAD_CLASS_NAME = 'siemEventsTable__thead';

interface EventsTableProps {
  $activePage: number;
  $columnCount: number;
  columnWidths: number;
  $rowCount: number;
  $totalPages: number;
}

export const EventsTable = styled.div.attrs<EventsTableProps>(
  ({ className = '', $columnCount, columnWidths, $activePage, $rowCount, $totalPages }) => ({
    'aria-label': EVENTS_TABLE_ARIA_LABEL({ activePage: $activePage + 1, totalPages: $totalPages }),
    'aria-colcount': `${$columnCount}`,
    'aria-rowcount': `${$rowCount + 1}`,
    className: `siemEventsTable ${className}`,
    role: 'grid',
    style: {
      minWidth: `${columnWidths}px`,
    },
    tabindex: '-1',
  })
)<EventsTableProps>`
  padding: 3px;
`;

/* EVENTS HEAD */

export const EventsThead = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__thead ${className}`,
  role: 'rowgroup',
}))`
  background-color: ${({ theme }) => theme.eui.euiColorEmptyShade};
  border-bottom: ${({ theme }) => theme.eui.euiBorderWidthThick} solid
    ${({ theme }) => theme.eui.euiColorLightShade};
  position: sticky;
  top: 0;
  z-index: ${({ theme }) => theme.eui.euiZLevel1};
`;

export const EventsTrHeader = styled.div.attrs(({ className }) => ({
  'aria-rowindex': '1',
  className: `siemEventsTable__trHeader ${className}`,
  role: 'row',
}))`
  display: flex;
`;

export const EventsThGroupActions = styled.div.attrs(({ className = '' }) => ({
  'aria-colindex': `${ACTIONS_COLUMN_ARIA_COL_INDEX}`,
  className: `siemEventsTable__thGroupActions ${className}`,
  role: 'columnheader',
  tabIndex: '0',
}))<{ actionsColumnWidth: number; isEventViewer: boolean }>`
  display: flex;
  flex: 0 0
    ${({ actionsColumnWidth, isEventViewer }) =>
      `${!isEventViewer ? actionsColumnWidth + 4 : actionsColumnWidth}px`};
  min-width: 0;
  padding-left: ${({ isEventViewer }) =>
    !isEventViewer ? '4px;' : '0;'}; // match timeline event border
`;

export const EventsThGroupData = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__thGroupData ${className}`,
}))<{ isDragging?: boolean }>`
  display: flex;

  > div:hover .siemEventsHeading__handle {
    display: ${({ isDragging }) => (isDragging ? 'none' : 'block')};
    opacity: 1;
    visibility: visible;
  }
`;

export const EventsTh = styled.div.attrs<{ role: string }>(
  ({ className = '', role = 'columnheader' }) => ({
    className: `siemEventsTable__th ${className}`,
    role,
  })
)`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  min-width: 0;

  .siemEventsTable__thGroupActions &:first-child:last-child {
    flex: 1;
  }

  .siemEventsTable__thGroupData &:hover {
    background-color: ${({ theme }) => theme.eui.euiTableHoverColor};
    cursor: move; /* Fallback for IE11 */
    cursor: grab;
  }

  > div:focus {
    outline: 0; /* disable focus on Resizable element */
  }

  /* don't display Draggable placeholder */
  [data-rbd-placeholder-context-id] {
    display: none !important;
  }
`;

export const EventsThContent = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__thContent ${className}`,
}))<{ textAlign?: string; width?: number }>`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  min-width: 0;
  padding: ${({ theme }) => theme.eui.paddingSizes.xs};
  text-align: ${({ textAlign }) => textAlign};
  width: ${({ width }) =>
    width != null
      ? `${width}px`
      : '100%'}; /* Using width: 100% instead of flex: 1 and max-width: 100% for IE11 */

  > button.euiButtonIcon,
  > .euiToolTipAnchor > button.euiButtonIcon {
    margin-left: ${({ theme }) => `-${theme.eui.paddingSizes.xs}`};
  }
`;

/* EVENTS BODY */

export const EventsTbody = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__tbody ${className}`,
  role: 'rowgroup',
}))`
  overflow-x: hidden;
`;

export const EventsTrGroup = styled.div.attrs(
  ({ className = '', $ariaRowindex }: { className?: string; $ariaRowindex: number }) => ({
    'aria-rowindex': `${$ariaRowindex}`,
    className: `siemEventsTable__trGroup ${className}`,
    role: 'row',
  })
)<{
  className?: string;
  eventType: Omit<TimelineEventsType, 'all'>;
  isEvenEqlSequence: boolean;
  isBuildingBlockType: boolean;
  isExpanded: boolean;
  showLeftBorder: boolean;
}>`
  border-bottom: ${({ theme }) => theme.eui.euiBorderWidthThin} solid
    ${({ theme }) => theme.eui.euiColorLightShade};
  ${({ theme, eventType, isEvenEqlSequence, showLeftBorder }) =>
    showLeftBorder
      ? `border-left: 4px solid
    ${
      eventType === 'raw'
        ? theme.eui.euiColorLightShade
        : eventType === 'eql' && isEvenEqlSequence
        ? theme.eui.euiColorPrimary
        : eventType === 'eql' && !isEvenEqlSequence
        ? theme.eui.euiColorAccent
        : theme.eui.euiColorWarning
    }`
      : ''};
  ${({ isBuildingBlockType }) =>
    isBuildingBlockType
      ? 'background: repeating-linear-gradient(127deg, rgba(245, 167, 0, 0.2), rgba(245, 167, 0, 0.2) 1px, rgba(245, 167, 0, 0.05) 2px, rgba(245, 167, 0, 0.05) 10px);'
      : ''};
  ${({ eventType, isEvenEqlSequence }) =>
    eventType === 'eql'
      ? isEvenEqlSequence
        ? 'background: repeating-linear-gradient(127deg, rgba(0, 107, 180, 0.2), rgba(0, 107, 180, 0.2) 1px, rgba(0, 107, 180, 0.05) 2px, rgba(0, 107, 180, 0.05) 10px);'
        : 'background: repeating-linear-gradient(127deg, rgba(221, 10, 115, 0.2), rgba(221, 10, 115, 0.2) 1px, rgba(221, 10, 115, 0.05) 2px, rgba(221, 10, 115, 0.05) 10px);'
      : ''};

  &:hover {
    background-color: ${({ theme }) => theme.eui.euiTableHoverColor};
  }

  ${({ isExpanded, theme }) =>
    isExpanded &&
    `
    background: ${theme.eui.euiTableSelectedColor};

    &:hover {
      ${theme.eui.euiTableHoverSelectedColor}
    }
  `}
`;

export const EventsTrData = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__trData ${className}`,
}))`
  display: flex;
`;

const TIMELINE_EVENT_DETAILS_OFFSET = 40;

interface WidthProp {
  width: number;
}

export const EventsTrSupplementContainer = styled.div.attrs<WidthProp>(({ width }) => ({
  role: 'dialog',
  style: {
    width: `${width - TIMELINE_EVENT_DETAILS_OFFSET}px`,
  },
}))<WidthProp>``;

export const EventsTrSupplement = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__trSupplement ${className}` as string,
}))<{ className: string }>`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  padding-left: ${({ theme }) => theme.eui.paddingSizes.m};
  .euiAccordion + div {
    background-color: ${({ theme }) => theme.eui.euiColorEmptyShade};
    padding: 0 ${({ theme }) => theme.eui.paddingSizes.s};
    border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
    border-radius: ${({ theme }) => theme.eui.paddingSizes.xs};
  }
`;

export const EventsTdGroupActions = styled.div.attrs(({ className = '' }) => ({
  'aria-colindex': `${ACTIONS_COLUMN_ARIA_COL_INDEX}`,
  className: `siemEventsTable__tdGroupActions ${className}`,
  role: 'gridcell',
}))<{ width: number }>`
  align-items: center;
  display: flex;
  flex: 0 0 ${({ width }) => `${width}px`};
  min-width: 0;
`;

export const EventsTdGroupData = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__tdGroupData ${className}`,
}))`
  display: flex;
`;
interface EventsTdProps {
  $ariaColumnIndex?: number;
  width?: number;
}

export const EVENTS_TD_CLASS_NAME = 'siemEventsTable__td';

export const EventsTd = styled.div.attrs<EventsTdProps>(
  ({ className = '', $ariaColumnIndex, width }) => {
    const common = {
      className: `siemEventsTable__td ${className}`,
      role: 'gridcell',
      style: {
        flexBasis: width ? `${width}px` : 'auto',
      },
    };

    return $ariaColumnIndex != null
      ? {
          ...common,
          'aria-colindex': `${$ariaColumnIndex}`,
        }
      : common;
  }
)<EventsTdProps>`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  min-width: 0;

  .siemEventsTable__tdGroupActions &:first-child:last-child {
    flex: 1;
  }
`;

export const EventsTdContent = styled.div.attrs(({ className }) => ({
  className: `siemEventsTable__tdContent ${className != null ? className : ''}`,
}))<{ textAlign?: string; width?: number }>`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  min-width: 0;
  padding: ${({ theme }) => theme.eui.paddingSizes.xs};
  text-align: ${({ textAlign }) => textAlign};
  width: ${({ width }) =>
    width != null
      ? `${width}px`
      : '100%'}; /* Using width: 100% instead of flex: 1 and max-width: 100% for IE11 */

  button.euiButtonIcon {
    margin-left: ${({ theme }) => `-${theme.eui.paddingSizes.xs}`};
  }
`;

/**
 * EVENTS HEADING
 */

export const EventsHeading = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsHeading ${className}`,
}))<{ isLoading: boolean }>`
  align-items: center;
  display: flex;

  &:hover {
    cursor: ${({ isLoading }) => (isLoading ? 'wait' : 'grab')};
  }
`;

export const EventsHeadingTitleButton = styled.button.attrs(({ className = '' }) => ({
  className: `siemEventsHeading__title siemEventsHeading__title--aggregatable ${className}`,
  type: 'button',
}))`
  align-items: center;
  display: flex;
  font-weight: inherit;
  min-width: 0;

  &:hover,
  &:focus {
    color: ${({ theme }) => theme.eui.euiColorPrimary};
    text-decoration: underline;
  }

  &:hover {
    cursor: pointer;
  }

  & > * + * {
    margin-left: ${({ theme }) => theme.eui.euiSizeXS};
  }
`;

export const EventsHeadingTitleSpan = styled.span.attrs(({ className }) => ({
  className: `siemEventsHeading__title siemEventsHeading__title--notAggregatable ${className}`,
}))`
  min-width: 0;
`;

export const EventsHeadingExtra = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsHeading__extra ${className}` as string,
}))`
  margin-left: auto;
  margin-right: 2px;

  &.siemEventsHeading__extra--close {
    opacity: 0;
    transition: all ${({ theme }) => theme.eui.euiAnimSpeedNormal} ease;
    visibility: hidden;

    .siemEventsTable__th:hover & {
      opacity: 1;
      visibility: visible;
    }
  }
`;

export const EventsHeadingHandle = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsHeading__handle ${className}`,
}))`
  background-color: ${({ theme }) => theme.eui.euiBorderColor};
  height: 100%;
  opacity: 0;
  transition: all ${({ theme }) => theme.eui.euiAnimSpeedNormal} ease;
  visibility: hidden;
  width: ${({ theme }) => theme.eui.euiBorderWidthThick};

  &:hover {
    background-color: ${({ theme }) => theme.eui.euiColorPrimary};
    cursor: col-resize;
  }
`;

/**
 * EVENTS LOADING
 */

export const EventsLoading = styled(EuiLoadingSpinner)`
  margin: 0 2px;
  vertical-align: middle;
`;

export const HideShowContainer = styled.div.attrs<{ $isVisible: boolean }>(
  ({ $isVisible = false }) => ({
    style: {
      display: $isVisible ? 'block' : 'none',
    },
  })
)<{ $isVisible: boolean }>``;

export const FullWidthFlexGroup = styled(EuiFlexGroup)<{ $visible?: boolean }>`
  overflow: hidden;
  margin: 0;
  min-height: 490px;
  display: ${({ $visible = true }) => ($visible ? 'flex' : 'none')};
`;

export const UpdatedFlexGroup = styled(EuiFlexGroup)<{ $view?: ViewSelection }>`
  ${({ $view, theme }) =>
    $view === 'gridView' ? `margin-right: ${theme.eui.paddingSizes.xl};` : ''}
  position: absolute;
  z-index: ${({ theme }) => theme.eui.euiZLevel1};
  right: 0px;
`;

export const UpdatedFlexItem = styled(EuiFlexItem)<{ $show: boolean }>`
  ${({ $show }) => ($show ? '' : 'visibility: hidden;')}
`;

export const AlertCount = styled.span`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  border-right: ${({ theme }) => theme.eui.euiBorderThin};
  margin-right: ${({ theme }) => theme.eui.paddingSizes.s};
  padding-right: ${({ theme }) => theme.eui.paddingSizes.m};
`;
