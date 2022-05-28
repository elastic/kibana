/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { LogColumn, LogMessagePart } from '../../../../common/log_entry';
import {
  isConstantSegment,
  isFieldSegment,
  isHighlightFieldSegment,
  isHighlightMessageColumn,
  isMessageColumn,
} from '../../../utils/log_entry';
import { FieldValue } from './field_value';
import { LogEntryColumnContent } from './log_entry_column';
import {
  longWrappedContentStyle,
  preWrappedContentStyle,
  unwrappedContentStyle,
  WrapMode,
} from './text_styles';

interface LogEntryMessageColumnProps {
  columnValue: LogColumn;
  highlights: LogColumn[];
  isActiveHighlight: boolean;
  wrapMode: WrapMode;
  render?: (message: string) => React.ReactNode;
}

export const LogEntryMessageColumn = memo<LogEntryMessageColumnProps>(
  ({ columnValue, highlights, isActiveHighlight, wrapMode, render }) => {
    const message = useMemo(
      () =>
        isMessageColumn(columnValue)
          ? formatMessageSegments(columnValue.message, highlights, isActiveHighlight)
          : null,
      [columnValue, highlights, isActiveHighlight]
    );

    const messageAsString = useMemo(
      () => (isMessageColumn(columnValue) ? renderMessageSegments(columnValue.message) : ''),
      [columnValue]
    );

    return (
      <MessageColumnContent wrapMode={wrapMode}>
        {render ? render(messageAsString) : message}
      </MessageColumnContent>
    );
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
  messageSegments.map((messageSegment, index) => {
    if (isFieldSegment(messageSegment)) {
      // we only support one highlight for now
      const [firstHighlight = []] = highlights.map((highlight) => {
        if (isHighlightMessageColumn(highlight)) {
          const segment = highlight.message[index];
          if (isHighlightFieldSegment(segment)) {
            return segment.highlights;
          }
        }
        return [];
      });

      return (
        <FieldValue
          highlightTerms={firstHighlight}
          isActiveHighlight={isActiveHighlight}
          key={`MessageSegment-${index}`}
          value={messageSegment.value}
        />
      );
    } else if (isConstantSegment(messageSegment)) {
      return messageSegment.constant;
    }

    return 'failed to format message';
  });

const renderMessageSegments = (messageSegments: LogMessagePart[]): string => {
  return messageSegments
    .map((messageSegment) => {
      if (isConstantSegment(messageSegment)) {
        return messageSegment.constant;
      }
      if (isFieldSegment(messageSegment)) {
        return messageSegment.value.toString();
      }
    })
    .join(' ');
};
