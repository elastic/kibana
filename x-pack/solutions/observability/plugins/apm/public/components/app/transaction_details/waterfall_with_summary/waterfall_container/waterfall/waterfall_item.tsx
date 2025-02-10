/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiIcon, EuiText, EuiTitle, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import React, { useRef, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { isMobileAgentName, isRumAgentName } from '../../../../../../../common/agent_name';
import { TRACE_ID, TRANSACTION_ID } from '../../../../../../../common/es_fields/apm';
import { asDuration } from '../../../../../../../common/utils/formatters';
import type { Margins } from '../../../../../shared/charts/timeline';
import { TruncateWithTooltip } from '../../../../../shared/truncate_with_tooltip';
import { SyncBadge } from './badge/sync_badge';
import { SpanLinksBadge } from './badge/span_links_badge';
import { ColdStartBadge } from './badge/cold_start_badge';
import type { IWaterfallSpanOrTransaction } from './waterfall_helpers/waterfall_helpers';
import { FailureBadge } from './failure_badge';
import { useApmRouter } from '../../../../../../hooks/use_apm_router';
import { useAnyOfApmParams } from '../../../../../../hooks/use_apm_params';
import { OrphanItemTooltipIcon } from './orphan_item_tooltip_icon';

type ItemType = 'transaction' | 'span' | 'error';

interface IContainerStyleProps {
  type: ItemType;
  timelineMargins: Margins;
  isSelected: boolean;
  hasToggle: boolean;
}

interface IBarStyleProps {
  type: ItemType;
  color: string;
}

const Container = styled.div<IContainerStyleProps>`
  position: relative;
  display: block;
  user-select: none;
  padding-top: ${({ theme }) => theme.euiTheme.size.s};
  padding-bottom: ${({ theme }) => theme.euiTheme.size.m};
  margin-right: ${(props) => props.timelineMargins.right}px;
  margin-left: ${(props) =>
    props.hasToggle
      ? props.timelineMargins.left - 30 // fix margin if there is a toggle
      : props.timelineMargins.left}px;
  background-color: ${({ isSelected, theme }) =>
    isSelected ? theme.euiTheme.colors.lightestShade : 'initial'};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.euiTheme.colors.lightestShade};
  }
`;

const ItemBar = styled.div<IBarStyleProps>`
  box-sizing: border-box;
  position: relative;
  height: ${({ theme }) => theme.euiTheme.size.base};
  min-width: 2px;
  background-color: ${(props) => props.color};
`;

const ItemText = styled.span`
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.euiTheme.size.l};
  max-width: 100%;

  /* add margin to all direct descendants */
  & > * {
    margin-right: ${({ theme }) => theme.euiTheme.size.s};
    white-space: nowrap;
  }
`;

const CriticalPathItemBar = styled.div`
  box-sizing: border-box;
  position: relative;
  height: ${({ theme }) => theme.euiTheme.size.s};
  top: ${({ theme }) => theme.euiTheme.size.s};
  min-width: 2px;
  background-color: transparent;
  display: flex;
  flex-direction: row;
`;

const CriticalPathItemSegment = styled.div<{
  left: number;
  width: number;
  color: string;
}>`
  box-sizing: border-box;
  position: absolute;
  height: ${({ theme }) => theme.euiTheme.size.s};
  left: ${(props) => props.left * 100}%;
  width: ${(props) => props.width * 100}%;
  min-width: 2px;
  background-color: ${(props) => props.color};
`;

interface IWaterfallItemProps {
  timelineMargins: Margins;
  totalDuration?: number;
  item: IWaterfallSpanOrTransaction;
  hasToggle: boolean;
  color: string;
  isSelected: boolean;
  errorCount: number;
  marginLeftLevel: number;
  segments?: Array<{
    id: string;
    left: number;
    width: number;
    color: string;
  }>;
  onClick: (flyoutDetailTab: string) => unknown;
}

function PrefixIcon({ item }: { item: IWaterfallSpanOrTransaction }) {
  switch (item.docType) {
    case 'span': {
      const spanType = item.doc.span.type || '';

      // icon for database spans
      const isDbType = spanType.startsWith('db');
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
          item.doc.span.composite.compression_strategy === 'exact_match' ? 'x' : '';
        name = `${item.doc.span.composite.count}${compositePrefix} ${name}`;
      }
      return (
        <EuiText style={{ overflow: 'hidden' }} size="s">
          <TruncateWithTooltip content={name} text={name} />
        </EuiText>
      );
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
  hasToggle,
  color,
  isSelected,
  errorCount,
  marginLeftLevel,
  onClick,
  segments,
}: IWaterfallItemProps) {
  const [widthFactor, setWidthFactor] = useState(1);
  const waterfallItemRef: React.RefObject<any> = useRef(null);
  useEffect(() => {
    if (waterfallItemRef?.current && marginLeftLevel) {
      setWidthFactor(1 + marginLeftLevel / waterfallItemRef.current.offsetWidth);
    }
  }, [marginLeftLevel]);

  if (!totalDuration) {
    return null;
  }

  const width = (item.duration / totalDuration) * widthFactor * 100;
  const left = (((item.offset + item.skew) / totalDuration) * widthFactor - widthFactor + 1) * 100;

  const isCompositeSpan = item.docType === 'span' && item.doc.span.composite;

  const itemBarStyle = getItemBarStyle(item, color, width, left);

  const isServerlessColdstart = item.docType === 'transaction' && item.doc.faas?.coldstart;

  const waterfallItemFlyoutTab = 'metadata';

  return (
    <Container
      ref={waterfallItemRef}
      type={item.docType}
      timelineMargins={timelineMargins}
      isSelected={isSelected}
      hasToggle={hasToggle}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(waterfallItemFlyoutTab);
      }}
    >
      <ItemBar // using inline styles instead of props to avoid generating a css class for each item
        style={itemBarStyle}
        color={isCompositeSpan ? 'transparent' : color}
        type={item.docType}
      >
        {segments?.length ? (
          <CriticalPathItemBar>
            {segments?.map((segment) => (
              <CriticalPathItemSegment
                key={segment.id}
                color={segment.color}
                left={segment.left}
                width={segment.width}
              />
            ))}
          </CriticalPathItemBar>
        ) : null}
      </ItemBar>
      <ItemText // using inline styles instead of props to avoid generating a css class for each item
        style={{ minWidth: `${Math.max(100 - left, 0)}%` }}
      >
        <SpanActionToolTip item={item}>
          <PrefixIcon item={item} />
        </SpanActionToolTip>
        {item.isOrphan ? <OrphanItemTooltipIcon docType={item.docType} /> : null}
        <HttpStatusCode item={item} />
        <NameLabel item={item} />

        <Duration item={item} />
        <RelatedErrors item={item} errorCount={errorCount} />
        {item.docType === 'span' && (
          <SyncBadge sync={item.doc.span.sync} agentName={item.doc.agent.name} />
        )}
        <SpanLinksBadge
          linkedParents={item.spanLinksCount.linkedParents}
          linkedChildren={item.spanLinksCount.linkedChildren}
          id={item.id}
          onClick={onClick}
        />
        {isServerlessColdstart && <ColdStartBadge />}
      </ItemText>
    </Container>
  );
}

function RelatedErrors({
  item,
  errorCount,
}: {
  item: IWaterfallSpanOrTransaction;
  errorCount: number;
}) {
  const apmRouter = useApmRouter();
  const { euiTheme } = useEuiTheme();
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/traces/explorer',
    '/dependencies/operation'
  );

  let kuery = `${TRACE_ID} : "${item.doc.trace.id}"`;
  if (item.doc.transaction?.id) {
    kuery += ` and ${TRANSACTION_ID} : "${item.doc.transaction?.id}"`;
  }

  const mobileHref = apmRouter.link(`/mobile-services/{serviceName}/errors-and-crashes`, {
    path: { serviceName: item.doc.service.name },
    query: {
      ...query,
      serviceGroup: '',
      kuery,
    },
  });

  const href = apmRouter.link(`/services/{serviceName}/errors`, {
    path: { serviceName: item.doc.service.name },
    query: {
      ...query,
      serviceGroup: '',
      kuery,
    },
  });

  if (errorCount > 0) {
    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <EuiBadge
          href={isMobileAgentName(item.doc.agent.name) ? mobileHref : href}
          color={euiTheme.colors.danger}
          iconType="arrowRight"
        >
          {i18n.translate('xpack.apm.waterfall.errorCount', {
            defaultMessage:
              '{errorCount, plural, one {View related error} other {View # related errors}}',
            values: { errorCount },
          })}
        </EuiBadge>
      </div>
    );
  }

  return <FailureBadge outcome={item.doc.event?.outcome} />;
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
    const spanSumRatio = item.doc.span.composite.sum.us / item.doc.span.duration.us;
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
