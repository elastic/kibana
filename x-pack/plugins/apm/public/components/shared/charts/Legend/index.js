/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import styled from 'styled-components';
import {
  unit,
  units,
  px,
  colors,
  fontSizes
} from '../../../../style/variables';

const Container = styled.div`
  display: flex;
  align-items: center;
  font-size: ${props => props.fontSize};
  color: ${colors.gray2};
  cursor: ${props => (props.clickable ? 'pointer' : 'initial')};
  opacity: ${props => (props.disabled ? 0.4 : 1)};
  margin-right: ${px(unit)};
  user-select: none;
`;

export const Indicator = styled.span`
  width: ${props => px(props.radius)};
  height: ${props => px(props.radius)};
  margin-right: ${props => px(props.radius / 2)};
  background: ${props => props.color};
  border-radius: 100%;
`;

export default class Legend extends PureComponent {
  render() {
    const {
      onClick,
      color,
      text,
      fontSize = fontSizes.small,
      radius = units.minus - 1,
      disabled = false,
      clickable = true,
      className
    } = this.props;
    return (
      <Container
        onClick={onClick}
        disabled={disabled}
        clickable={clickable}
        fontSize={fontSize}
        className={className}
      >
        <Indicator color={color} radius={radius} />
        {text}
      </Container>
    );
  }
}
