/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import {
  colors,
  fontFamilyCode,
  fontSizes,
  px,
  unit,
  units
} from '../../../../../../style/variables';
import { IWaterfallItem } from './waterfall_helpers/waterfall_helpers';

const ItemBar = styled.div`
  position: relative;
  height: ${unit}px;
`;
const ItemLabel = styled.div`
  white-space: nowrap;
  position: relative;
  direction: rtl;
  text-align: left;
  margin: ${px(units.quarter)} 0 0;
  font-family: ${fontFamilyCode};
  font-size: ${fontSizes.small};
`;

const Container = styled<
  { timelineMargins: TimelineMargins; isSelected: boolean },
  'div'
>('div')`
  position: relative;
  display: block;
  user-select: none;
  padding: ${px(units.half)} ${props => px(props.timelineMargins.right)}
    ${px(units.eighth)} ${props => px(props.timelineMargins.left)};
  border-top: 1px solid ${colors.gray4};
  background-color: ${props => (props.isSelected ? colors.gray5 : 'initial')};
  cursor: pointer;
  &:hover {
    background-color: ${colors.gray5};
  }
`;

interface TimelineMargins {
  right: number;
  left: number;
  top: number;
  bottom: number;
}

interface Props {
  timelineMargins: TimelineMargins;
  totalDuration: number;
  item: IWaterfallItem;
  color: string;
  isSelected: boolean;
  onClick: () => any;
}

export function WaterfallItem({
  timelineMargins,
  totalDuration,
  item,
  color,
  isSelected,
  onClick
}: Props) {
  const width = (item.duration / totalDuration) * 100;
  const left = (item.offset / totalDuration) * 100;

  return (
    <Container
      onClick={onClick}
      timelineMargins={timelineMargins}
      isSelected={isSelected}
    >
      <ItemBar
        style={{
          left: `${left}%`,
          width: `${width}%`,
          minWidth: '2px',
          backgroundColor: color
        }}
      />
      <ItemLabel
        style={{
          left: `${left}%`,
          width: `${100 - left}%`
        }}
      >
        &lrm;
        {item.name}
        &lrm;
      </ItemLabel>
    </Container>
  );
}
