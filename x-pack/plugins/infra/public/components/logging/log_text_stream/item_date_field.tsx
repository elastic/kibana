/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { darken } from 'polished';
import * as React from 'react';
import { css } from 'styled-components';

import { TextScale } from '../../../../common/log_text_scale';
import { tintOrShade } from '../../../utils/styles';
import { LogTextStreamItemField } from './item_field';

interface LogTextStreamItemDateFieldProps {
  children: string;
  hasHighlights: boolean;
  isHovered: boolean;
  scale: TextScale;
}

export class LogTextStreamItemDateField extends React.PureComponent<
  LogTextStreamItemDateFieldProps,
  {}
> {
  public render() {
    const { children, hasHighlights, isHovered, scale } = this.props;

    return (
      <LogTextStreamItemDateFieldWrapper
        hasHighlights={hasHighlights}
        isHovered={isHovered}
        scale={scale}
      >
        {children}
      </LogTextStreamItemDateFieldWrapper>
    );
  }
}

const highlightedFieldStyle = css`
  background-color: ${props =>
    tintOrShade(props.theme.eui.euiTextColor, props.theme.eui.euiColorSecondary, 0.15)};
  border-color: ${props => props.theme.eui.euiColorSecondary};
`;

const hoveredFieldStyle = css`
  background-color: ${props => darken(0.05, props.theme.eui.euiColorHighlight)};
  border-color: ${props => darken(0.2, props.theme.eui.euiColorHighlight)};
  color: ${props => props.theme.eui.euiColorFullShade};
`;

const LogTextStreamItemDateFieldWrapper = LogTextStreamItemField.extend.attrs<{
  hasHighlights: boolean;
  isHovered: boolean;
}>({})`
  background-color: ${props => props.theme.eui.euiColorLightestShade};
  border-right: solid 2px ${props => props.theme.eui.euiColorLightShade};
  color: ${props => props.theme.eui.euiColorDarkShade};
  white-space: pre;

  ${props => (props.hasHighlights ? highlightedFieldStyle : '')};
  ${props => (props.isHovered ? hoveredFieldStyle : '')};
`;
