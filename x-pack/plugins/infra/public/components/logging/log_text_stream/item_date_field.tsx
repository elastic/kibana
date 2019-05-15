/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { darken, transparentize } from 'polished';
import React, { memo } from 'react';

import { css } from '../../../../../../common/eui_styled_components';
import { TextScale } from '../../../../common/log_text_scale';
import { tintOrShade } from '../../../utils/styles';
import { useFormattedTime } from '../../formatted_time';
import { LogTextStreamItemField } from './item_field';

interface LogTextStreamItemDateFieldProps {
  dataTestSubj?: string;
  hasHighlights: boolean;
  isHighlighted: boolean;
  isHovered: boolean;
  scale: TextScale;
  time: number;
}

export const LogTextStreamItemDateField = memo<LogTextStreamItemDateFieldProps>(
  ({ dataTestSubj, hasHighlights, isHighlighted, isHovered, scale, time }) => {
    const formattedTime = useFormattedTime(time);

    return (
      <LogTextStreamItemDateFieldWrapper
        data-test-subj={dataTestSubj}
        hasHighlights={hasHighlights}
        isHovered={isHovered}
        isHighlighted={isHighlighted}
        scale={scale}
      >
        {formattedTime}
      </LogTextStreamItemDateFieldWrapper>
    );
  }
);

const highlightedFieldStyle = css`
  background-color: ${props =>
    tintOrShade(
      props.theme.eui.euiTextColor as any,
      props.theme.eui.euiColorSecondary as any,
      0.15
    )};
  border-color: ${props => props.theme.eui.euiColorSecondary};
`;

const hoveredFieldStyle = css`
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

const LogTextStreamItemDateFieldWrapper = LogTextStreamItemField.extend.attrs<{
  hasHighlights: boolean;
  isHovered: boolean;
  isHighlighted: boolean;
}>({})`
  background-color: ${props => props.theme.eui.euiColorLightestShade};
  border-right: solid 2px ${props => props.theme.eui.euiColorLightShade};
  color: ${props => props.theme.eui.euiColorDarkShade};
  white-space: pre;

  ${props => (props.hasHighlights ? highlightedFieldStyle : '')};
  ${props => (props.isHovered || props.isHighlighted ? hoveredFieldStyle : '')};
`;
