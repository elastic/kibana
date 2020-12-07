/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { JsonValue } from '../../../../common/typed_json';
import { euiStyled } from '../../../../../observability/public';
import { LogColumn } from '../../../../common/http_api';
import { isFieldColumn, isHighlightFieldColumn } from '../../../utils/log_entry';
import { FieldValue } from './field_value';
import { LogEntryColumnContent } from './log_entry_column';
import {
  longWrappedContentStyle,
  preWrappedContentStyle,
  unwrappedContentStyle,
  WrapMode,
} from './text_styles';

interface LogEntryFieldColumnProps {
  columnValue: LogColumn;
  highlights: LogColumn[];
  isActiveHighlight: boolean;
  wrapMode: WrapMode;
  render?: (value: JsonValue) => React.ReactNode;
}

export const LogEntryFieldColumn: React.FunctionComponent<LogEntryFieldColumnProps> = ({
  columnValue,
  highlights: [firstHighlight], // we only support one highlight for now
  isActiveHighlight,
  wrapMode,
  render,
}) => {
  if (isFieldColumn(columnValue)) {
    return (
      <FieldColumnContent wrapMode={wrapMode}>
        <FieldValue
          highlightTerms={isHighlightFieldColumn(firstHighlight) ? firstHighlight.highlights : []}
          isActiveHighlight={isActiveHighlight}
          value={columnValue.value}
          render={render}
        />
      </FieldColumnContent>
    );
  } else {
    return null;
  }
};

interface LogEntryColumnContentProps {
  wrapMode: WrapMode;
}

const FieldColumnContent = euiStyled(LogEntryColumnContent)<LogEntryColumnContentProps>`
  text-overflow: ellipsis;

  ${(props) =>
    props.wrapMode === 'long'
      ? longWrappedContentStyle
      : props.wrapMode === 'pre-wrapped'
      ? preWrappedContentStyle
      : unwrappedContentStyle};
`;
