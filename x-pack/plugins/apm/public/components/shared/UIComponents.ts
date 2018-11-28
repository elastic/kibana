/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import { colors, fontSizes, px, unit, units } from '../../style/variables';

export const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${px(units.plus)};

  h1 {
    font-size: ${fontSizes.xxlarge};
  }
`;

export const HeaderLarge = styled.h1`
  font-size: ${fontSizes.xxlarge};
  margin-bottom: ${px(units.plus)};

  &:after {
    content: '.';
    visibility: hidden;
  }
`;

export const HeaderMedium = styled<{ css: string }, 'h2'>('h2')`
  margin: ${px(units.plus)} 0;
  font-size: ${fontSizes.xlarge};
  ${props => props.css};
`;

export const HeaderSmall = styled<{ css: string }, 'h3'>('h3')`
  margin: ${px(units.plus)} 0;
  font-size: ${fontSizes.large};
  ${props => props.css};
`;

export const Tab = styled<{ selected: boolean }, 'div'>('div')`
  display: inline-block;
  font-size: ${fontSizes.large};
  padding: ${px(unit)} ${px(unit + units.quarter)};
  text-align: center;
  cursor: pointer;
  user-select: none;

  border-bottom: ${props =>
    props.selected && `${units.quarter / 2}px solid ${colors.blue1}`};
`;
