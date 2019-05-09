/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { darken, transparentize } from 'polished';
import React, { useMemo } from 'react';

import { css } from '../../../../../../common/eui_styled_components';
import { LogEntryColumnContent } from './log_entry_column';

interface LogEntryFieldColumnProps {
  encodedValue: string;
  isHighlighted: boolean;
  isHovered: boolean;
  isWrapped: boolean;
}

export const LogEntryFieldColumn: React.FunctionComponent<LogEntryFieldColumnProps> = ({
  encodedValue,
  isHighlighted,
  isHovered,
  isWrapped,
}) => {
  const value = useMemo(() => JSON.parse(encodedValue), [encodedValue]);

  return (
    <FieldColumnContent isHighlighted={isHighlighted} isHovered={isHovered} isWrapped={isWrapped}>
      {value}
    </FieldColumnContent>
  );
};

const hoveredContentStyle = css`
  background-color: ${props =>
    props.theme.darkMode
      ? transparentize(0.9, darken(0.05, props.theme.eui.euiColorHighlight))
      : darken(0.05, props.theme.eui.euiColorHighlight)};
`;

const wrappedContentStyle = css`
  overflow: visible;
  white-space: pre-wrap;
  word-break: break-all;
`;

const unwrappedContentStyle = css`
  overflow: hidden;
  white-space: pre;
`;

const FieldColumnContent = LogEntryColumnContent.extend.attrs<{
  isHighlighted: boolean;
  isHovered: boolean;
  isWrapped?: boolean;
}>({})`
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  text-overflow: ellipsis;

  ${props => (props.isHovered || props.isHighlighted ? hoveredContentStyle : '')};
  ${props => (props.isWrapped ? wrappedContentStyle : unwrappedContentStyle)};
`;
