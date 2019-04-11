/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { darken, transparentize } from 'polished';
import React, { useMemo } from 'react';

import { css } from '../../../../../../common/eui_styled_components';
import { TextScale } from '../../../../common/log_text_scale';
import { LogTextStreamItemField } from './item_field';

interface LogTextStreamItemFieldFieldProps {
  encodedValue: string;
  isHovered: boolean;
  scale: TextScale;
}

export const LogTextStreamItemFieldField: React.FunctionComponent<
  LogTextStreamItemFieldFieldProps
> = ({ encodedValue, isHovered, scale }) => {
  const value = useMemo(() => JSON.parse(encodedValue), [encodedValue]);

  if (value === null) {
    return null;
  }

  return (
    <LogTextStreamItemFieldFieldWrapper isHovered={isHovered} scale={scale}>
      {value}
    </LogTextStreamItemFieldFieldWrapper>
  );
};

const hoveredFieldStyle = css`
  background-color: ${props =>
    props.theme.darkMode
      ? transparentize(0.9, darken(0.05, props.theme.eui.euiColorHighlight))
      : darken(0.05, props.theme.eui.euiColorHighlight)};
`;

const LogTextStreamItemFieldFieldWrapper = LogTextStreamItemField.extend.attrs<{
  isHovered: boolean;
}>({})`
  flex-grow: 1;
  text-overflow: ellipsis;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  padding: 0 ${props => props.theme.eui.paddingSizes.l};

  ${props => (props.isHovered ? hoveredFieldStyle : '')};
`;
