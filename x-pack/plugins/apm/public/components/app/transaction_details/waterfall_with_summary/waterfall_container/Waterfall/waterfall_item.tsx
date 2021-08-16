/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiText, EuiTitle, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactNode } from 'react';
import { euiStyled } from '../../../../../../../../../../src/plugins/kibana_react/common';
import { isRumAgentName } from '../../../../../../../common/agent_name';
import { TRACE_ID } from '../../../../../../../common/elasticsearch_fieldnames';
import { asDuration } from '../../../../../../../common/utils/formatters';
import { Margins } from '../../../../../shared/charts/Timeline';
import { ErrorOverviewLink } from '../../../../../shared/Links/apm/ErrorOverviewLink';
import { ErrorCount } from '../../ErrorCount';
import { SyncBadge } from './sync_badge';
import { IWaterfallSpanOrTransaction } from './waterfall_helpers/waterfall_helpers';

type ItemType = 'transaction' | 'span' | 'error';

interface IContainerStyleProps {
  type: ItemType;
  timelineMargins: Margins;
  isSelected: boolean;
}

interface IBarStyleProps {
  type: ItemType;
  color: string;
}

const Container = euiStyled.div<IContainerStyleProps>`
  position: relative;
  display: block;
  user-select: none;
  padding-top: ${({ theme }) => theme.eui.paddingSizes.s};
  padding-bottom: ${({ theme }) => theme.eui.euiSizeM};
  margin-right: ${(props) => props.timelineMargins.right}px;
  margin-left: ${(props) => props.timelineMargins.left}px;
  background-color: ${({ isSelected, theme }) =>
    isSelected ? theme.eui.euiColorLightestShade : 'initial'};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.eui.euiColorLightestShade};
  }
`;

const ItemBar = euiStyled.div<IBarStyleProps>`
  box-sizing: border-box;
  position: relative;
  height: ${({ theme }) => theme.eui.euiSize};
  min-width: 2px;
  background-color: ${(props) => props.color};
`;

const ItemText = euiStyled.span`
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.eui.euiSizeL};

  /* add margin to all direct descendants */
  & > * {
    margin-right: ${({ theme }) => theme.eui.euiSizeS};
    white-space: nowrap;
  }
`;

interface IWaterfallItemProps {
  timelineMargins: Margins;
  totalDuration?: number;
  item: IWaterfallSpanOrTransaction;
  color: string;
  isSelected: boolean;
  errorCount: number;
  onClick: () => unknown;
}

function PrefixIcon({ item }: { item: IWaterfallSpanOrTransaction }) {
  switch (item.docType) {
    case 'span': {
      // icon for database spans
      const isDbType = item.doc.span.type.startsWith('db');
      if (isDbType) {
        return <EuiIcon type="database" />;
      }

      // omit icon for other spans
      return null;
    }
    case 'transaction': {
      // icon for RUM agent transactions
      if (isRumAgentName(item.doc.agent.name)) {
        return <EuiIcon type="globe" />;
      }

      // icon for other transactions
      return <EuiIcon type="merge" />;
    }
    default:
      return null;
  }
}

interface SpanActionToolTipProps {
  children: ReactNode;
  item?: IWaterfallSpanOrTransaction;
}

function SpanActionToolTip({ item, children }: SpanActionToolTipProps) {
  if (item?.docType === 'span') {
    return (
      <EuiToolTip content={`${item.doc.span.subtype}.${item.doc.span.action}`}>
        <>{children}</>
      </EuiToolTip>
    );
  }
  return <>{children}</>;
}

function Duration({ item }: { item: IWaterfallSpanOrTransaction }) {
  return (
    <EuiText color="subdued" size="xs">
      {asDuration(item.duration)}
    </EuiText>
  );
}

function HttpStatusCode({ item }: { item: IWaterfallSpanOrTransaction }) {
  // http status code for transactions of type 'request'
  const httpStatusCode =
    item.docType === 'transaction' && item.doc.transaction.type === 'request'
      ? item.doc.transaction.result
      : undefined;

  if (!httpStatusCode) {
    return null;
  }

  return <EuiText size="xs">{httpStatusCode}</EuiText>;
}

function NameLabel({ item }: { item: IWaterfallSpanOrTransaction }) {
  switch (item.docType) {
    case 'span':
      let name = item.doc.span.name;
      if (item.doc.span.composite) {
        const compositePrefix =
          item.doc.span.composite.compression_strategy === 'exact_match'
            ? 'x'
            : '';
        name = `${item.doc.span.composite.count}${compositePrefix} ${name}`;
      }
      return <EuiText size="s">{name}</EuiText>;
    case 'transaction':
      return (
        <EuiTitle size="xxs">
          <h5>{item.doc.transaction.name}</h5>
        </EuiTitle>
      );
  }
}

export function WaterfallItem({
  timelineMargins,
  totalDuration,
  item,
  color,
  isSelected,
  errorCount,
  onClick,
}: IWaterfallItemProps) {
  if (!totalDuration) {
    return null;
  }

  const width = (item.duration / totalDuration) * 100;
  const left = ((item.offset + item.skew) / totalDuration) * 100;

  const tooltipContent = i18n.translate(
    'xpack.apm.transactionDetails.errorsOverviewLinkTooltip',
    {
      values: { errorCount },
      defaultMessage:
        '{errorCount, plural, one {View 1 related error} other {View # related errors}}',
    }
  );

  const isCompositeSpan = item.docType === 'span' && item.doc.span.composite;
  const itemBarStyle = getItemBarStyle(item, color, width, left);

  return (
    <Container
      type={item.docType}
      timelineMargins={timelineMargins}
      isSelected={isSelected}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <ItemBar // using inline styles instead of props to avoid generating a css class for each item
        style={itemBarStyle}
        color={isCompositeSpan ? 'transparent' : color}
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
          <ErrorOverviewLink
            serviceName={item.doc.service.name}
            query={{
              kuery: `${TRACE_ID} : "${item.doc.trace.id}" and transaction.id : "${item.doc.transaction.id}"`,
            }}
            color="danger"
            style={{ textDecoration: 'none' }}
          >
            <EuiToolTip content={tooltipContent}>
              <ErrorCount count={errorCount} />
            </EuiToolTip>
          </ErrorOverviewLink>
        ) : null}
        <Duration item={item} />
        {item.docType === 'span' && <SyncBadge sync={item.doc.span.sync} />}
      </ItemText>
    </Container>
  );
}

function getItemBarStyle(
  item: IWaterfallSpanOrTransaction,
  color: string,
  width: number,
  left: number
): React.CSSProperties {
  let itemBarStyle = { left: `${left}%`, width: `${width}%` };

  if (item.docType === 'span' && item.doc.span.composite) {
    const percNumItems = 100.0 / item.doc.span.composite.count;
    const spanSumRatio =
      item.doc.span.composite.sum.us / item.doc.span.duration.us;
    const percDuration = percNumItems * spanSumRatio;

    itemBarStyle = {
      ...itemBarStyle,
      ...{
        backgroundImage:
          `repeating-linear-gradient(90deg, ${color},` +
          ` ${color} max(${percDuration}%,3px),` +
          ` transparent max(${percDuration}%,3px),` +
          ` transparent max(${percNumItems}%,max(${percDuration}%,3px) + 3px))`,
      },
    };
  }

  return itemBarStyle;
}
