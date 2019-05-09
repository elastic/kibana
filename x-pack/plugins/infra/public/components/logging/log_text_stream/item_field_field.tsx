/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { darken, transparentize } from 'polished';
import React, { useMemo } from 'react';

import { css } from '../../../../../../common/eui_styled_components';
import { LogTextStreamItemField, LogTextStreamItemFieldContent } from './item_field';

interface LogTextStreamItemFieldFieldProps {
  dataTestSubj?: string;
  encodedValue: string;
  isHighlighted: boolean;
  isHovered: boolean;
}

export const LogTextStreamItemFieldField: React.FunctionComponent<
  LogTextStreamItemFieldFieldProps
> = ({ dataTestSubj, encodedValue, isHighlighted, isHovered }) => {
  const value = useMemo(() => JSON.parse(encodedValue), [encodedValue]);

  return (
    <LogTextStreamItemField data-test-subj={dataTestSubj} growWeight={1}>
      <FieldFieldContent isHighlighted={isHighlighted} isHovered={isHovered}>
        {value}
      </FieldFieldContent>
    </LogTextStreamItemField>
  );
};

const hoveredFieldStyle = css`
  background-color: ${props =>
    props.theme.darkMode
      ? transparentize(0.9, darken(0.05, props.theme.eui.euiColorHighlight))
      : darken(0.05, props.theme.eui.euiColorHighlight)};
`;

const FieldFieldContent = LogTextStreamItemFieldContent.extend.attrs<{
  isHighlighted: boolean;
  isHovered: boolean;
}>({})`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};

  ${props => (props.isHovered || props.isHighlighted ? hoveredFieldStyle : '')};
`;
