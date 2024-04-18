/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useTheme } from '../../../../hooks/use_theme';

export enum Shape {
  circle = 'circle',
  square = 'square',
}

interface ContainerProps {
  onClick: (e: Event) => void;
  clickable: boolean;
  disabled: boolean;
}

const Container = euiStyled.div<ContainerProps>`
  display: flex;
  align-items: center;
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
  cursor: ${(props) => (props.clickable ? 'pointer' : 'initial')};
  opacity: ${(props) => (props.disabled ? 0.4 : 1)};
  user-select: none;
`;

interface IndicatorProps {
  color: string;
  shape: Shape;
  withMargin: boolean;
}

const radius = 11;

export const Indicator = euiStyled.span<IndicatorProps>`
  width: ${radius}px;
  height: ${radius}px;
  margin-right: ${(props) => (props.withMargin ? `${radius / 2}px` : 0)};
  background: ${(props) => props.color};
  border-radius: ${(props) => {
    return props.shape === Shape.circle ? '100%' : '0';
  }};
`;

interface Props {
  onClick?: any;
  text?: string;
  color?: string;
  disabled?: boolean;
  clickable?: boolean;
  shape?: Shape;
  indicator?: React.ReactNode;
}

export function Legend({
  onClick,
  text,
  color,
  disabled = false,
  clickable = false,
  shape = Shape.circle,
  indicator,
  ...rest
}: Props) {
  const theme = useTheme();
  const indicatorColor = color || theme.eui.euiColorVis1;

  return (
    <Container
      onClick={onClick}
      disabled={disabled}
      clickable={clickable || Boolean(onClick)}
      {...rest}
    >
      {indicator ? (
        indicator
      ) : (
        <Indicator color={indicatorColor} shape={shape} withMargin={!!text} />
      )}
      {text}
    </Container>
  );
}
