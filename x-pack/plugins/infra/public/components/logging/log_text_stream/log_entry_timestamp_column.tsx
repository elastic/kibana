/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { darken, transparentize } from 'polished';
import React, { memo } from 'react';

import { euiStyled, css } from '../../../../../observability/public';
import { useFormattedTime } from '../../formatted_time';
import { LogEntryColumnContent } from './log_entry_column';

interface LogEntryTimestampColumnProps {
  isHighlighted: boolean;
  isHovered: boolean;
  time: number;
}

export const LogEntryTimestampColumn = memo<LogEntryTimestampColumnProps>(
  ({ isHighlighted, isHovered, time }) => {
    const formattedTime = useFormattedTime(time, { format: 'time' });

    return (
      <TimestampColumnContent isHovered={isHovered} isHighlighted={isHighlighted}>
        {formattedTime}
      </TimestampColumnContent>
    );
  }
);

const hoveredContentStyle = css`
  background-color: ${props =>
    props.theme.darkMode
      ? transparentize(0.9, darken(0.05, props.theme.eui.euiColorHighlight))
      : darken(0.05, props.theme.eui.euiColorHighlight)};
  border-color: ${props =>
    props.theme.darkMode
      ? transparentize(0.7, darken(0.2, props.theme.eui.euiColorHighlight))
      : darken(0.2, props.theme.eui.euiColorHighlight)};
  color: ${props => props.theme.eui.euiColorFullShade};
`;

interface TimestampColumnContentProps {
  isHovered: boolean;
  isHighlighted: boolean;
}

const TimestampColumnContent = euiStyled(LogEntryColumnContent)<TimestampColumnContentProps>`
  color: ${props => props.theme.eui.euiColorDarkShade};
  overflow: hidden;
  text-overflow: clip;
  white-space: pre;

  ${props => (props.isHovered || props.isHighlighted ? hoveredContentStyle : '')};
`;
