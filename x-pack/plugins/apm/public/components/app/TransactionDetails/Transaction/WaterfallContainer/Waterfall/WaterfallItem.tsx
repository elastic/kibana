/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { EuiIcon } from '@elastic/eui';
import {
  colors,
  fontFamily,
  fontFamilyCode,
  fontSize,
  fontSizes,
  px,
  unit,
  units
} from '../../../../../../style/variables';
import { IWaterfallItem } from './waterfall_helpers/waterfall_helpers';

interface ItemBarProps {
  type: 'transaction' | 'span';
  left: number;
  width: number;
  color: string;
}

const ItemBar = styled<ItemBarProps, any>('div')`
  box-sizing: border-box;
  position: relative;
  height: ${px(unit)};
  min-width: 2px;
  background-color: ${props => props.color};
`;

// Note: "direction: rtl;" is here to prevent text from running off of
// the right edge and instead pushing it to the left. For an example of
// how this works, see here: https://codepen.io/sqren/pen/JrXNjY
const SpanLabel = styled.div`
  white-space: nowrap;
  position: relative;
  direction: rtl;
  text-align: left;
  margin: ${px(units.quarter)} 0 0;
  font-family: ${fontFamilyCode};
  font-size: ${fontSizes.small};
`;

const TransactionLabel = styled(SpanLabel)`
  font-weight: 600;
  font-family: ${fontFamily};
  font-size: ${fontSize};
`;

interface IContainerProps {
  item: IWaterfallItem;
  timelineMargins: ITimelineMargins;
  isSelected: boolean;
}

const Container = styled<IContainerProps, 'div'>('div')`
  position: relative;
  display: block;
  user-select: none;
  padding: ${px(units.half)} ${props => px(props.timelineMargins.right)}
    ${props => px(props.item.docType === 'span' ? units.half : units.quarter)}
    ${props => px(props.timelineMargins.left)};
  border-top: 1px solid ${colors.gray4};
  background-color: ${props => (props.isSelected ? colors.gray5 : 'initial')};
  cursor: pointer;
  &:hover {
    background-color: ${colors.gray5};
  }
`;

interface ITimelineMargins {
  right: number;
  left: number;
  top: number;
  bottom: number;
}

interface IWaterfallItemProps {
  timelineMargins: ITimelineMargins;
  totalDuration?: number;
  item: IWaterfallItem;
  color: string;
  isSelected: boolean;
  onClick: () => any;
}

function Prefix({ item }: { item: IWaterfallItem }) {
  if (item.docType !== 'transaction') {
    return null;
  }

  return (
    <React.Fragment>
      <EuiIcon type="merge" />{' '}
    </React.Fragment>
  );
}

export function WaterfallItem({
  timelineMargins,
  totalDuration,
  item,
  color,
  isSelected,
  onClick
}: IWaterfallItemProps) {
  if (!totalDuration) {
    return null;
  }

  const width = (item.duration / totalDuration) * 100;
  const left = ((item.offset + item.skew) / totalDuration) * 100;
  const Label = item.docType === 'transaction' ? TransactionLabel : SpanLabel;

  // Note: the <Prefix> appears *after* the item name in the DOM order
  // because this label is styled with "direction: rtl;" so that the name
  // itself doesn't flow outside the box to the right.
  return (
    <Container
      item={item}
      timelineMargins={timelineMargins}
      isSelected={isSelected}
      onClick={onClick}
    >
      <ItemBar
        // using inline styles instead of props to avoid generating a css class for each item
        style={{ left: `${left}%`, width: `${width}%` }}
        color={color}
        type={item.docType}
      />
      <Label
        // using inline styles instead of props to avoid generating a css class for each item
        style={{ left: `${left}%`, width: `${Math.max(100 - left, 0)}%` }}
      >
        {item.name} <Prefix item={item} />
      </Label>
    </Container>
  );
}
