/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { EuiIcon } from '@elastic/eui';
import { asTime } from 'x-pack/plugins/apm/public/utils/formatters';
import { colors, px, unit, units } from '../../../../../../style/variables';
import { IWaterfallItem } from './waterfall_helpers/waterfall_helpers';

type ItemType = 'transaction' | 'span';

interface IContainerStyleProps {
  type: ItemType;
  timelineMargins: ITimelineMargins;
  isSelected: boolean;
}

interface IBarStyleProps {
  type: ItemType;
  left: number;
  width: number;
  color: string;
}

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
  box-sizing: border-box;
  position: relative;
  height: ${px(unit)};
  min-width: 2px;
  background-color: ${props => props.color};
`;

const ItemBarInner = styled.span`
  position: absolute;
  right: 0;
  margin-top: 5px;
`;

const SpanNameLabel = styled.span`
  color: ${colors.gray2};
  font-weight: normal;
  white-space: nowrap;
`;

const TransactionNameLabel = styled.span`
  font-weight: 600;
  white-space: nowrap;
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

function PrefixIcon({ item }: { item: IWaterfallItem }) {
  if (item.docType === 'span') {
    const isDbType = item.span.span.type === 'db';
    if (isDbType) {
      return <EuiIcon type="database" />;
    } else {
      return null;
    }
  }

  const isRumAgent = item.transaction.context.service.agent.name === 'js-base';
  if (isRumAgent) {
    return <EuiIcon type="globe" />;
  }

  return <EuiIcon type="merge" />;
}

const StyledDuration = styled.span`
  font-size: 0.9em;
  color: ${colors.gray2};
  margin-left: ${px(units.quarter)};
`;

function Duration({ item }: { item: IWaterfallItem }) {
  return <StyledDuration>{asTime(item.duration)}</StyledDuration>;
}

function HttpStatusCode({ item }: { item: IWaterfallItem }) {
  // http status code for transactions of type 'request'
  const httpStatusCode =
    item.docType === 'transaction' &&
    item.transaction.transaction.type === 'request'
      ? item.transaction.transaction.result
      : undefined;

  return <span>{httpStatusCode}</span>;
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
  const NameLabel =
    item.docType === 'span' ? SpanNameLabel : TransactionNameLabel;

  return (
    <Container
      type={item.docType}
      timelineMargins={timelineMargins}
      isSelected={isSelected}
      onClick={onClick}
    >
      <ItemBar // using inline styles instead of props to avoid generating a css class for each item
        style={{ left: `${left}%`, width: `${width}%` }}
        color={color}
        type={item.docType}
      />
      <ItemBarInner // using inline styles instead of props to avoid generating a css class for each item
        style={{ minWidth: `${Math.max(100 - left, 0)}%` }}
      >
        <PrefixIcon item={item} /> <HttpStatusCode item={item} />{' '}
        <NameLabel>{item.name}</NameLabel> <Duration item={item} />
      </ItemBarInner>
    </Container>
  );
}
