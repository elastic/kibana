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

<<<<<<< HEAD
interface ItemBarProps {
  type: 'transaction' | 'span';
=======
type ItemType = 'transaction' | 'span';

interface IContainerStyleProps {
  type: ItemType;
  timelineMargins: ITimelineMargins;
  isSelected: boolean;
}

interface IBarStyleProps {
  type: ItemType;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  left: number;
  width: number;
  color: string;
}

<<<<<<< HEAD
const ItemBar = styled<ItemBarProps, any>('div')`
=======
const Container = styled<IContainerStyleProps, 'div'>('div')`
  position: relative;
  display: block;
  user-select: none;
  padding-top: ${px(units.half)};
  padding-bottom: ${props =>
    px(props.type === 'span' ? units.plus + units.quarter : units.plus)};
  margin-right: ${props => px(props.timelineMargins.right)};
  margin-left: ${props => px(props.timelineMargins.left)};
  border-top: 1px solid ${colors.gray4};
  background-color: ${props => (props.isSelected ? colors.gray5 : 'initial')};
  cursor: pointer;
  &:hover {
    background-color: ${colors.gray5};
  }
`;

const ItemBar = styled<IBarStyleProps, any>('div')`
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  box-sizing: border-box;
  position: relative;
  height: ${px(unit)};
  min-width: 2px;
  background-color: ${props => props.color};
`;

<<<<<<< HEAD
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
=======
const ItemLabel = styled.div`
  white-space: nowrap;
  position: absolute;
  right: 0;
  width: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  text-align: left;
  margin: 0;
`;

const SpanLabel = styled(ItemLabel)`
  font-weight: normal;
  font-family: ${fontFamilyCode};
  font-size: ${fontSizes.small};
  bottom: ${px(units.half)};
`;

const TransactionLabel = styled(ItemLabel)`
  font-weight: 600;
  font-family: ${fontFamily};
  font-size: ${fontSize};
  bottom: ${px(units.quarter)};
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
  const Label = item.docType === 'transaction' ? TransactionLabel : SpanLabel;

  // Note: the <Prefix> appears *after* the item name in the DOM order
  // because this label is styled with "direction: rtl;" so that the name
  // itself doesn't flow outside the box to the right.
  return (
    <Container
      item={item}
=======
  const Label = item.docType === 'span' ? SpanLabel : TransactionLabel;

  return (
    <Container
      type={item.docType}
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
      timelineMargins={timelineMargins}
      isSelected={isSelected}
      onClick={onClick}
    >
<<<<<<< HEAD
      <ItemBar
        // using inline styles instead of props to avoid generating a css class for each item
=======
      <ItemBar // using inline styles instead of props to avoid generating a css class for each item
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        style={{ left: `${left}%`, width: `${width}%` }}
        color={color}
        type={item.docType}
      />
<<<<<<< HEAD
      <Label
        // using inline styles instead of props to avoid generating a css class for each item
        style={{ left: `${left}%`, width: `${Math.max(100 - left, 0)}%` }}
      >
        {item.name} <Prefix item={item} />
=======
      <Label // using inline styles instead of props to avoid generating a css class for each item
        style={{ minWidth: `${Math.max(100 - left, 0)}%` }}
      >
        <Prefix item={item} /> {item.name}
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
      </Label>
    </Container>
  );
}
