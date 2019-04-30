/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { EuiIcon, EuiText, EuiTitle, EuiToolTip } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { isRumAgentName } from '../../../../../../../common/agent_name';
import { px, unit, units } from '../../../../../../style/variables';
import { asTime } from '../../../../../../utils/formatters';
import { ErrorCountBadge } from '../../ErrorCountBadge';
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
  padding-bottom: ${px(units.plus)};
  margin-right: ${props => px(props.timelineMargins.right)};
  margin-left: ${props => px(props.timelineMargins.left)};
  border-top: 1px solid ${theme.euiColorLightShade};
  background-color: ${props =>
    props.isSelected ? theme.euiColorLightestShade : 'initial'};
  cursor: pointer;

  &:hover {
    background-color: ${theme.euiColorLightestShade};
  }
`;

const ItemBar = styled<IBarStyleProps, any>('div')`
  box-sizing: border-box;
  position: relative;
  height: ${px(unit)};
  min-width: 2px;
  background-color: ${props => props.color};
`;

const ItemText = styled.span`
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  height: ${px(units.plus)};

  /* add margin to all direct descendants */
  & > * {
    margin-right: ${px(units.half)};
    white-space: nowrap;
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
  errorCount: number;
  onClick: () => unknown;
}

function PrefixIcon({ item }: { item: IWaterfallItem }) {
  if (item.docType === 'span') {
    // icon for database spans
    const isDbType = item.span.span.type.startsWith('db');
    if (isDbType) {
      return <EuiIcon type="database" />;
    }

    // omit icon for other spans
    return null;
  }

  // icon for RUM agent transactions
  if (isRumAgentName(item.transaction.agent.name)) {
    return <EuiIcon type="globe" />;
  }

  // icon for other transactions
  return <EuiIcon type="merge" />;
}

interface SpanActionToolTipProps {
  item?: IWaterfallItem;
}

const SpanActionToolTip: React.SFC<SpanActionToolTipProps> = ({
  item,
  children
}) => {
  if (item && item.docType === 'span') {
    return (
      <EuiToolTip
        content={`${item.span.span.subtype}.${item.span.span.action}`}
      >
        <>{children}</>
      </EuiToolTip>
    );
  }
  return <>{children}</>;
};

function Duration({ item }: { item: IWaterfallItem }) {
  return (
    <EuiText color="subdued" size="xs">
      {asTime(item.duration)}
    </EuiText>
  );
}

function HttpStatusCode({ item }: { item: IWaterfallItem }) {
  // http status code for transactions of type 'request'
  const httpStatusCode =
    item.docType === 'transaction' &&
    item.transaction.transaction.type === 'request'
      ? item.transaction.transaction.result
      : undefined;

  if (!httpStatusCode) {
    return null;
  }

  return <EuiText size="xs">{httpStatusCode}</EuiText>;
}

function NameLabel({ item }: { item: IWaterfallItem }) {
  if (item.docType === 'span') {
    return <EuiText size="s">{item.name}</EuiText>;
  }
  return (
    <EuiTitle size="xxs">
      <h5>{item.name}</h5>
    </EuiTitle>
  );
}

export function WaterfallItem({
  timelineMargins,
  totalDuration,
  item,
  color,
  isSelected,
  errorCount,
  onClick
}: IWaterfallItemProps) {
  if (!totalDuration) {
    return null;
  }

  const width = (item.duration / totalDuration) * 100;
  const left = ((item.offset + item.skew) / totalDuration) * 100;

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
      <ItemText // using inline styles instead of props to avoid generating a css class for each item
        style={{ minWidth: `${Math.max(100 - left, 0)}%` }}
      >
        <SpanActionToolTip item={item}>
          <PrefixIcon item={item} />
        </SpanActionToolTip>
        <HttpStatusCode item={item} />
        <NameLabel item={item} />
        {errorCount > 0 && item.docType === 'transaction' ? (
          <ErrorCountBadge
            errorCount={errorCount}
            transaction={item.transaction}
          />
        ) : null}
        <Duration item={item} />
      </ItemText>
    </Container>
  );
}
