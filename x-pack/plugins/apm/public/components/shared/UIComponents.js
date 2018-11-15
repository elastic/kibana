/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import { unit, units, px, fontSizes, colors } from '../../style/variables';
import { RelativeLink } from '../../utils/url';

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

export const HeaderMedium = styled.h2`
  margin: ${px(units.plus)} 0;
  font-size: ${fontSizes.xlarge};
  ${props => props.css};
`;

export const HeaderSmall = styled.h3`
  margin: ${px(units.plus)} 0;
  font-size: ${fontSizes.large};
  ${props => props.css};
`;

export const Tab = styled.div`
  display: inline-block;
  font-size: ${fontSizes.large};
  padding: ${px(unit)} ${px(unit + units.quarter)};
  text-align: center;
  cursor: pointer;
  user-select: none;

  border-bottom: ${props =>
    props.selected && `${units.quarter / 2}px solid ${colors.blue1}`};
`;

export const TabLink = Tab.withComponent(RelativeLink);
