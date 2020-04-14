/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash';

import { euiStyled } from '../../../../../observability/public';
import { isTimestampColumn } from '../../../utils/log_entry';
import {
  LogColumnConfiguration,
  isTimestampLogColumnConfiguration,
  isMessageLogColumnConfiguration,
  isFieldLogColumnConfiguration,
} from '../../../utils/source_configuration';
import { TextScale } from '../../../../common/log_text_scale';
import { LogEntryColumn, LogEntryColumnWidths, iconColumnId } from './log_entry_column';
import { LogEntryFieldColumn } from './log_entry_field_column';
import { LogEntryActionsColumn } from './log_entry_actions_column';
import { LogEntryMessageColumn } from './log_entry_message_column';
import { LogEntryTimestampColumn } from './log_entry_timestamp_column';
import { monospaceTextStyle, hoveredContentStyle, highlightedContentStyle } from './text_styles';
import { LogEntry, LogColumn } from '../../../../common/http_api';

interface LogEntryRowProps {
  boundingBoxRef?: React.Ref<Element>;
  columnConfigurations: LogColumnConfiguration[];
  columnWidths: LogEntryColumnWidths;
  highlights: LogEntry[];
  isActiveHighlight: boolean;
  isHighlighted: boolean;
  logEntry: LogEntry;
  openFlyoutWithItem?: (id: string) => void;
  openViewLogInContext?: (entry: LogEntry) => void;
  scale: TextScale;
  wrap: boolean;
}

export const LogEntryRow = memo(
  ({
    boundingBoxRef,
    columnConfigurations,
    columnWidths,
    highlights,
    isActiveHighlight,
    isHighlighted,
    logEntry,
    openFlyoutWithItem,
    openViewLogInContext,
    scale,
    wrap,
  }: LogEntryRowProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const openMenu = useCallback(() => setIsMenuOpen(true), []);
    const closeMenu = useCallback(() => setIsMenuOpen(false), []);

    const setItemIsHovered = useCallback(() => setIsHovered(true), []);
    const setItemIsNotHovered = useCallback(() => setIsHovered(false), []);

    const openFlyout = useCallback(() => openFlyoutWithItem?.(logEntry.id), [
      openFlyoutWithItem,
      logEntry.id,
    ]);

    const handleOpenViewLogInContext = useCallback(() => openViewLogInContext?.(logEntry), [
      openViewLogInContext,
      logEntry,
    ]);

    const hasContext = useMemo(() => !isEmpty(logEntry.context), [logEntry]);
    const hasActionFlyoutWithItem = openFlyoutWithItem !== undefined;
    const hasActionViewLogInContext = hasContext && openViewLogInContext !== undefined;
    const hasActionsMenu = hasActionFlyoutWithItem || hasActionViewLogInContext;

    const logEntryColumnsById = useMemo(
      () =>
        logEntry.columns.reduce<{
          [columnId: string]: LogEntry['columns'][0];
        }>(
          (columnsById, column) => ({
            ...columnsById,
            [column.columnId]: column,
          }),
          {}
        ),
      [logEntry.columns]
    );

    const highlightsByColumnId = useMemo(
      () =>
        highlights.reduce<{
          [columnId: string]: LogColumn[];
        }>(
          (columnsById, highlight) =>
            highlight.columns.reduce(
              (innerColumnsById, column) => ({
                ...innerColumnsById,
                [column.columnId]: [...(innerColumnsById[column.columnId] || []), column],
              }),
              columnsById
            ),
          {}
        ),
      [highlights]
    );

    return (
      <LogEntryRowWrapper
        data-test-subj="streamEntry logTextStreamEntry"
        ref={
          /* Workaround for missing RefObject support in styled-components */
          boundingBoxRef as any
        }
        onMouseEnter={setItemIsHovered}
        onMouseLeave={setItemIsNotHovered}
        isHighlighted={isHighlighted}
        scale={scale}
      >
        {columnConfigurations.map(columnConfiguration => {
          if (isTimestampLogColumnConfiguration(columnConfiguration)) {
            const column = logEntryColumnsById[columnConfiguration.timestampColumn.id];
            const columnWidth = columnWidths[columnConfiguration.timestampColumn.id];

            return (
              <LogEntryColumn
                data-test-subj="logColumn timestampLogColumn"
                key={columnConfiguration.timestampColumn.id}
                {...columnWidth}
              >
                {isTimestampColumn(column) ? (
                  <LogEntryTimestampColumn time={column.timestamp} />
                ) : null}
              </LogEntryColumn>
            );
          } else if (isMessageLogColumnConfiguration(columnConfiguration)) {
            const column = logEntryColumnsById[columnConfiguration.messageColumn.id];
            const columnWidth = columnWidths[columnConfiguration.messageColumn.id];

            return (
              <LogEntryColumn
                data-test-subj="logColumn messageLogColumn"
                key={columnConfiguration.messageColumn.id}
                {...columnWidth}
              >
                {column ? (
                  <LogEntryMessageColumn
                    columnValue={column}
                    highlights={highlightsByColumnId[column.columnId] || []}
                    isActiveHighlight={isActiveHighlight}
                    wrapMode={wrap ? 'long' : 'pre-wrapped'}
                  />
                ) : null}
              </LogEntryColumn>
            );
          } else if (isFieldLogColumnConfiguration(columnConfiguration)) {
            const column = logEntryColumnsById[columnConfiguration.fieldColumn.id];
            const columnWidth = columnWidths[columnConfiguration.fieldColumn.id];

            return (
              <LogEntryColumn
                data-test-subj={`logColumn fieldLogColumn fieldLogColumn:${columnConfiguration.fieldColumn.field}`}
                key={columnConfiguration.fieldColumn.id}
                {...columnWidth}
              >
                {column ? (
                  <LogEntryFieldColumn
                    columnValue={column}
                    highlights={highlightsByColumnId[column.columnId] || []}
                    isActiveHighlight={isActiveHighlight}
                    wrapMode={wrap ? 'long' : 'pre-wrapped'}
                  />
                ) : null}
              </LogEntryColumn>
            );
          }
        })}
        {hasActionsMenu ? (
          <LogEntryColumn
            key="logColumn iconLogColumn iconLogColumn:details"
            {...columnWidths[iconColumnId]}
          >
            <LogEntryActionsColumn
              isHovered={isHovered}
              isMenuOpen={isMenuOpen}
              onOpenMenu={openMenu}
              onCloseMenu={closeMenu}
              onViewDetails={hasActionFlyoutWithItem ? openFlyout : undefined}
              onViewLogInContext={
                hasActionViewLogInContext ? handleOpenViewLogInContext : undefined
              }
            />
          </LogEntryColumn>
        ) : null}
      </LogEntryRowWrapper>
    );
  }
);

interface LogEntryRowWrapperProps {
  scale: TextScale;
  isHighlighted?: boolean;
}

export const LogEntryRowWrapper = euiStyled.div.attrs(() => ({
  role: 'row',
}))<LogEntryRowWrapperProps>`
  align-items: stretch;
  color: ${props => props.theme.eui.euiTextColor};
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  overflow: hidden;

  ${props => monospaceTextStyle(props.scale)};
  ${props => (props.isHighlighted ? highlightedContentStyle : '')}

  &:hover {
    ${hoveredContentStyle}
  }
`;
