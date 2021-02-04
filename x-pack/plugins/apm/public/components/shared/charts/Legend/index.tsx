/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { useTheme } from '../../../../hooks/use_theme';
import { fontSizes, px, units } from '../../../../style/variables';

export enum Shape {
  circle = 'circle',
  square = 'square',
}

interface ContainerProps {
  onClick: (e: Event) => void;
  fontSize?: string;
  clickable: boolean;
  disabled: boolean;
}

const Container = styled.div<ContainerProps>`
  display: flex;
  align-items: center;
  font-size: ${(props) => props.fontSize};
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
  cursor: ${(props) => (props.clickable ? 'pointer' : 'initial')};
  opacity: ${(props) => (props.disabled ? 0.4 : 1)};
  user-select: none;
`;

interface IndicatorProps {
  radius: number;
  color: string;
  shape: Shape;
  withMargin: boolean;
}

export const Indicator = styled.span<IndicatorProps>`
  width: ${(props) => px(props.radius)};
  height: ${(props) => px(props.radius)};
  margin-right: ${(props) => (props.withMargin ? px(props.radius / 2) : 0)};
  background: ${(props) => props.color};
  border-radius: ${(props) => {
    return props.shape === Shape.circle ? '100%' : '0';
  }};
`;

interface Props {
  onClick?: any;
  text?: string;
  color?: string;
  fontSize?: string;
  radius?: number;
  disabled?: boolean;
  clickable?: boolean;
  shape?: Shape;
  indicator?: () => React.ReactNode;
}

export function Legend({
  onClick,
  text,
  color,
  fontSize = fontSizes.small,
  radius = units.minus - 1,
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
      fontSize={fontSize}
      {...rest}
    >
      {indicator ? (
        indicator()
      ) : (
        <Indicator
          color={indicatorColor}
          radius={radius}
          shape={shape}
          withMargin={!!text}
        />
      )}
      {text}
    </Container>
  );
}
