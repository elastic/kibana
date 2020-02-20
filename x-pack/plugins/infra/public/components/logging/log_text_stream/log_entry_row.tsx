/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { darken, transparentize } from 'polished';
import React, { useState, useCallback, useMemo } from 'react';

import { euiStyled } from '../../../../../observability/public';
import {
  LogEntry,
  LogEntryHighlight,
  LogEntryHighlightColumn,
  isTimestampColumn,
} from '../../../utils/log_entry';
import {
  LogColumnConfiguration,
  isTimestampLogColumnConfiguration,
  isMessageLogColumnConfiguration,
  isFieldLogColumnConfiguration,
} from '../../../utils/source_configuration';
import { TextScale } from '../../../../common/log_text_scale';
import { LogEntryColumn, LogEntryColumnWidths, iconColumnId } from './log_entry_column';
import { LogEntryFieldColumn } from './log_entry_field_column';
import { LogEntryDetailsIconColumn } from './log_entry_icon_column';
import { LogEntryMessageColumn } from './log_entry_message_column';
import { LogEntryTimestampColumn } from './log_entry_timestamp_column';
import { monospaceTextStyle } from './text_styles';

interface LogEntryRowProps {
  boundingBoxRef?: React.Ref<Element>;
  columnConfigurations: LogColumnConfiguration[];
  columnWidths: LogEntryColumnWidths;
  highlights: LogEntryHighlight[];
  isActiveHighlight: boolean;
  isHighlighted: boolean;
  logEntry: LogEntry;
  openFlyoutWithItem: (id: string) => void;
  scale: TextScale;
  wrap: boolean;
}

export const LogEntryRow = ({
  boundingBoxRef,
  columnConfigurations,
  columnWidths,
  highlights,
  isActiveHighlight,
  isHighlighted,
  logEntry,
  openFlyoutWithItem,
  scale,
  wrap,
}: LogEntryRowProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const setItemIsHovered = useCallback(() => {
    setIsHovered(true);
  }, []);

  const setItemIsNotHovered = useCallback(() => {
    setIsHovered(false);
  }, []);

  const openFlyout = useCallback(() => openFlyoutWithItem(logEntry.gid), [
    openFlyoutWithItem,
    logEntry.gid,
  ]);

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
        [columnId: string]: LogEntryHighlightColumn[];
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
                <LogEntryTimestampColumn
                  isHighlighted={isHighlighted}
                  isHovered={isHovered}
                  time={column.timestamp}
                />
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
                  isHighlighted={isHighlighted}
                  isActiveHighlight={isActiveHighlight}
                  isHovered={isHovered}
                  isWrapped={wrap}
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
                  isHighlighted={isHighlighted}
                  isHovered={isHovered}
                  isWrapped={wrap}
                />
              ) : null}
            </LogEntryColumn>
          );
        }
      })}
      <LogEntryColumn
        key="logColumn iconLogColumn iconLogColumn:details"
        {...columnWidths[iconColumnId]}
      >
        <LogEntryDetailsIconColumn
          isHighlighted={isHighlighted}
          isHovered={isHovered}
          openFlyout={openFlyout}
        />
      </LogEntryColumn>
    </LogEntryRowWrapper>
  );
};

interface LogEntryRowWrapperProps {
  scale: TextScale;
}

const LogEntryRowWrapper = euiStyled.div.attrs(() => ({
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
`;
