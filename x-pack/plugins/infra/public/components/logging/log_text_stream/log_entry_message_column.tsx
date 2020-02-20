/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import stringify from 'json-stable-stringify';

import { euiStyled, css } from '../../../../../observability/public';
import {
  isConstantSegment,
  isFieldSegment,
  isHighlightMessageColumn,
  isMessageColumn,
  isHighlightFieldSegment,
} from '../../../utils/log_entry';
import { ActiveHighlightMarker, highlightFieldValue, HighlightMarker } from './highlighting';
import { LogEntryColumnContent } from './log_entry_column';
import { hoveredContentStyle } from './text_styles';
import { LogColumn, LogMessagePart } from '../../../../common/http_api';

interface LogEntryMessageColumnProps {
  columnValue: LogColumn;
  highlights: LogColumn[];
  isActiveHighlight: boolean;
  isHighlighted: boolean;
  isHovered: boolean;
  isWrapped: boolean;
}

export const LogEntryMessageColumn = memo<LogEntryMessageColumnProps>(
  ({ columnValue, highlights, isActiveHighlight, isHighlighted, isHovered, isWrapped }) => {
    const message = useMemo(
      () =>
        isMessageColumn(columnValue)
          ? formatMessageSegments(columnValue.message, highlights, isActiveHighlight)
          : null,
      [columnValue, highlights, isActiveHighlight]
    );

    return (
      <MessageColumnContent
        isHighlighted={isHighlighted}
        isHovered={isHovered}
        isWrapped={isWrapped}
      >
        {message}
      </MessageColumnContent>
    );
  }
);

const wrappedContentStyle = css`
  overflow: visible;
  white-space: pre-wrap;
  word-break: break-all;
`;

const unwrappedContentStyle = css`
  overflow: hidden;
  white-space: pre;
`;

interface MessageColumnContentProps {
  isHovered: boolean;
  isHighlighted: boolean;
  isWrapped?: boolean;
}

const MessageColumnContent = euiStyled(LogEntryColumnContent)<MessageColumnContentProps>`
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  text-overflow: ellipsis;

  ${props => (props.isHovered || props.isHighlighted ? hoveredContentStyle : '')};
  ${props => (props.isWrapped ? wrappedContentStyle : unwrappedContentStyle)};
`;

const formatMessageSegments = (
  messageSegments: LogMessagePart[],
  highlights: LogColumn[],
  isActiveHighlight: boolean
) =>
  messageSegments.map((messageSegment, index) =>
    formatMessageSegment(
      messageSegment,
      highlights.map(highlight => {
        if (isHighlightMessageColumn(highlight)) {
          const segment = highlight.message[index];
          if (isHighlightFieldSegment(segment)) {
            return segment.highlights;
          }
        }
        return [];
      }),
      isActiveHighlight
    )
  );

const formatMessageSegment = (
  messageSegment: LogMessagePart,
  [firstHighlight = []]: string[][], // we only support one highlight for now
  isActiveHighlight: boolean
): React.ReactNode => {
  if (isFieldSegment(messageSegment)) {
    const value =
      typeof messageSegment.value === 'string'
        ? messageSegment.value
        : stringify(messageSegment.value);

    return highlightFieldValue(
      value,
      firstHighlight,
      isActiveHighlight ? ActiveHighlightMarker : HighlightMarker
    );
  } else if (isConstantSegment(messageSegment)) {
    return messageSegment.constant;
  }

  return 'failed to format message';
};
