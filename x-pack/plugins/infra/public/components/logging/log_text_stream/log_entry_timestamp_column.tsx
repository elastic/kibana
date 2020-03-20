/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';

import { euiStyled } from '../../../../../observability/public';
import { TimeFormat, useFormattedTime } from '../../formatted_time';
import { LogEntryColumnContent } from './log_entry_column';
import { hoveredContentStyle } from './text_styles';

interface LogEntryTimestampColumnProps {
  format?: TimeFormat;
  isHighlighted: boolean;
  time: number;
}

export const LogEntryTimestampColumn = memo<LogEntryTimestampColumnProps>(
  ({ format = 'time', isHighlighted, time }) => {
    const formattedTime = useFormattedTime(time, { format });

    return (
      <TimestampColumnContent isHighlighted={isHighlighted}>{formattedTime}</TimestampColumnContent>
    );
  }
);

interface TimestampColumnContentProps {
  isHighlighted: boolean;
}

const TimestampColumnContent = euiStyled(LogEntryColumnContent)<TimestampColumnContentProps>`
  color: ${props => props.theme.eui.euiColorDarkShade};
  overflow: hidden;
  text-overflow: clip;
  white-space: pre;

  ${props => (props.isHighlighted ? hoveredContentStyle : '')};
`;
