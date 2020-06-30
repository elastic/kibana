/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';

import { euiStyled } from '../../../../../observability/public';
import { TimeFormat, useFormattedTime } from '../../formatted_time';
import { LogEntryColumnContent } from './log_entry_column';

interface LogEntryTimestampColumnProps {
  format?: TimeFormat;
  time: number;
}

export const LogEntryTimestampColumn = memo<LogEntryTimestampColumnProps>(
  ({ format = 'time', time }) => {
    const formattedTime = useFormattedTime(time, { format });

    return <TimestampColumnContent>{formattedTime}</TimestampColumnContent>;
  }
);

const TimestampColumnContent = euiStyled(LogEntryColumnContent)`
  color: ${(props) => props.theme.eui.euiColorDarkShade};
  overflow: hidden;
  text-overflow: clip;
  white-space: pre;
`;
