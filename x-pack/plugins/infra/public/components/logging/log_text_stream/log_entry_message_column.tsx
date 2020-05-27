/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import stringify from 'json-stable-stringify';

import { euiStyled } from '../../../../../observability/public';
import {
  isConstantSegment,
  isFieldSegment,
  isHighlightMessageColumn,
  isMessageColumn,
  isHighlightFieldSegment,
} from '../../../utils/log_entry';
import { ActiveHighlightMarker, highlightFieldValue, HighlightMarker } from './highlighting';
import { LogEntryColumnContent } from './log_entry_column';
import {
  longWrappedContentStyle,
  preWrappedContentStyle,
  unwrappedContentStyle,
  WrapMode,
} from './text_styles';
import { LogColumn, LogMessagePart } from '../../../../common/http_api';

interface LogEntryMessageColumnProps {
  columnValue: LogColumn;
  highlights: LogColumn[];
  isActiveHighlight: boolean;
  wrapMode: WrapMode;
}

export const LogEntryMessageColumn = memo<LogEntryMessageColumnProps>(
  ({ columnValue, highlights, isActiveHighlight, wrapMode }) => {
    const message = useMemo(
      () =>
        isMessageColumn(columnValue)
          ? formatMessageSegments(columnValue.message, highlights, isActiveHighlight)
          : null,
      [columnValue, highlights, isActiveHighlight]
    );

    return <MessageColumnContent wrapMode={wrapMode}>{message}</MessageColumnContent>;
  }
);

interface MessageColumnContentProps {
  wrapMode: WrapMode;
}

const MessageColumnContent = euiStyled(LogEntryColumnContent)<MessageColumnContentProps>`
  text-overflow: ellipsis;
  ${(props) =>
    props.wrapMode === 'long'
      ? longWrappedContentStyle
      : props.wrapMode === 'pre-wrapped'
      ? preWrappedContentStyle
      : unwrappedContentStyle};
`;

const formatMessageSegments = (
  messageSegments: LogMessagePart[],
  highlights: LogColumn[],
  isActiveHighlight: boolean
) =>
  messageSegments.map((messageSegment, index) =>
    formatMessageSegment(
      messageSegment,
      highlights.map((highlight) => {
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
