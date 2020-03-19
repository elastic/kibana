/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';

import { euiStyled } from '../../../../../observability/public';
import {
  isConstantSegment,
  isFieldSegment,
  isHighlightMessageColumn,
  isMessageColumn,
  LogEntryColumn,
  LogEntryHighlightColumn,
  LogEntryMessageSegment,
} from '../../../utils/log_entry';
import { ActiveHighlightMarker, highlightFieldValue, HighlightMarker } from './highlighting';
import { LogEntryColumnContent } from './log_entry_column';
import {
  hoveredContentStyle,
  longWrappedContentStyle,
  preWrappedContentStyle,
  unwrappedContentStyle,
  WrapMode,
} from './text_styles';

interface LogEntryMessageColumnProps {
  columnValue: LogEntryColumn;
  highlights: LogEntryHighlightColumn[];
  isActiveHighlight: boolean;
  isHighlighted: boolean;
  isHovered: boolean;
  wrapMode: WrapMode;
}

export const LogEntryMessageColumn = memo<LogEntryMessageColumnProps>(
  ({ columnValue, highlights, isActiveHighlight, isHighlighted, isHovered, wrapMode }) => {
    const message = useMemo(
      () =>
        isMessageColumn(columnValue)
          ? formatMessageSegments(columnValue.message, highlights, isActiveHighlight)
          : null,
      [columnValue, highlights, isActiveHighlight]
    );

    return (
      <MessageColumnContent isHighlighted={isHighlighted} isHovered={isHovered} wrapMode={wrapMode}>
        {message}
      </MessageColumnContent>
    );
  }
);

interface MessageColumnContentProps {
  isHovered: boolean;
  isHighlighted: boolean;
  wrapMode: WrapMode;
}

const MessageColumnContent = euiStyled(LogEntryColumnContent)<MessageColumnContentProps>`
  text-overflow: ellipsis;

  ${props => (props.isHovered || props.isHighlighted ? hoveredContentStyle : '')};
  ${props =>
    props.wrapMode === 'long'
      ? longWrappedContentStyle
      : props.wrapMode === 'pre-wrapped'
      ? preWrappedContentStyle
      : unwrappedContentStyle};
`;

const formatMessageSegments = (
  messageSegments: LogEntryMessageSegment[],
  highlights: LogEntryHighlightColumn[],
  isActiveHighlight: boolean
) =>
  messageSegments.map((messageSegment, index) =>
    formatMessageSegment(
      messageSegment,
      highlights.map(highlight =>
        isHighlightMessageColumn(highlight) ? highlight.message[index].highlights : []
      ),
      isActiveHighlight
    )
  );

const formatMessageSegment = (
  messageSegment: LogEntryMessageSegment,
  [firstHighlight = []]: string[][], // we only support one highlight for now
  isActiveHighlight: boolean
): React.ReactNode => {
  if (isFieldSegment(messageSegment)) {
    return highlightFieldValue(
      messageSegment.value,
      firstHighlight,
      isActiveHighlight ? ActiveHighlightMarker : HighlightMarker
    );
  } else if (isConstantSegment(messageSegment)) {
    return messageSegment.constant;
  }

  return 'failed to format message';
};
