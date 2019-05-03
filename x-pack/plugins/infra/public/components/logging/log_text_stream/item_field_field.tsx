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
  dataTestSubj?: string;
  encodedValue: string;
  isHighlighted: boolean;
  isHovered: boolean;
  scale: TextScale;
}

export const LogTextStreamItemFieldField: React.FunctionComponent<
  LogTextStreamItemFieldFieldProps
> = ({ dataTestSubj, encodedValue, isHighlighted, isHovered, scale }) => {
  const value = useMemo(() => JSON.parse(encodedValue), [encodedValue]);

  return (
    <LogTextStreamItemFieldFieldWrapper
      data-test-subj={dataTestSubj}
      isHighlighted={isHighlighted}
      isHovered={isHovered}
      scale={scale}
    >
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
  isHighlighted: boolean;
  isHovered: boolean;
}>({})`
  flex: 1 0 0%;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};

  ${props => (props.isHovered || props.isHighlighted ? hoveredFieldStyle : '')};
`;
