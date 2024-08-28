/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiIcon, EuiText, EuiTitle, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactNode, useRef, useEffect, useState } from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useTheme } from '../../../../../../hooks/use_theme';
import { isMobileAgentName, isRumAgentName } from '../../../../../../../common/agent_name';
import {
  AGENT_NAME,
  SPAN_COMPOSITE_COMPRESSION_STRATEGY,
  SPAN_COMPOSITE_COUNT,
  SPAN_COMPOSITE_SUM,
  SPAN_DURATION,
  SPAN_SYNC,
  TRACE_ID,
  SERVICE_NAME,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  SPAN_ACTION,
  TRANSACTION_TYPE,
  TRANSACTION_RESULT,
  TRANSACTION_NAME,
  TRANSACTION_ID,
  FAAS_COLDSTART,
  EVENT_OUTCOME,
} from '../../../../../../../common/es_fields/apm';
import { asDuration } from '../../../../../../../common/utils/formatters';
import { Margins } from '../../../../../shared/charts/timeline';
import { TruncateWithTooltip } from '../../../../../shared/truncate_with_tooltip';
import { SyncBadge } from './badge/sync_badge';
import { SpanLinksBadge } from './badge/span_links_badge';
import { ColdStartBadge } from './badge/cold_start_badge';
import { IWaterfallSpanOrTransaction } from './waterfall_helpers/waterfall_helpers';
import { FailureBadge } from './failure_badge';
import { useApmRouter } from '../../../../../../hooks/use_apm_router';
import { useAnyOfApmParams } from '../../../../../../hooks/use_apm_params';

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

const Container = euiStyled.div<IContainerStyleProps>`
  position: relative;
  display: block;
  user-select: none;
  padding-top: ${({ theme }) => theme.eui.euiSizeS};
  padding-bottom: ${({ theme }) => theme.eui.euiSizeM};
  margin-right: ${(props) => props.timelineMargins.right}px;
  margin-left: ${(props) =>
    props.hasToggle
      ? props.timelineMargins.left - 30 // fix margin if there is a toggle
      : props.timelineMargins.left}px ;
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
  max-width: 100%;

  /* add margin to all direct descendants */
  & > * {
    margin-right: ${({ theme }) => theme.eui.euiSizeS};
    white-space: nowrap;
  }
`;

const CriticalPathItemBar = euiStyled.div`
  box-sizing: border-box;
  position: relative;
  height: ${({ theme }) => theme.eui.euiSizeS};
  top : ${({ theme }) => theme.eui.euiSizeS};
  min-width: 2px;
  background-color: transparent;
  display: flex;
  flex-direction: row;
`;

const CriticalPathItemSegment = euiStyled.div<{
  left: number;
  width: number;
  color: string;
}>`
  box-sizing: border-box;
  position: absolute;
  height: ${({ theme }) => theme.eui.euiSizeS};
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
      const spanType = item.doc[SPAN_TYPE]?.[0] || '';

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
      if (isRumAgentName(item.doc[AGENT_NAME][0])) {
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
      <EuiToolTip content={`${item.doc[SPAN_SUBTYPE]?.[0]}.${item.doc[SPAN_ACTION]?.[0]}`}>
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
    item.docType === 'transaction' && item.doc[TRANSACTION_TYPE][0] === 'request'
      ? item.doc[TRANSACTION_RESULT]
      : undefined;

  if (!httpStatusCode) {
    return null;
  }

  return <EuiText size="xs">{httpStatusCode}</EuiText>;
}

function NameLabel({ item }: { item: IWaterfallSpanOrTransaction }) {
  switch (item.docType) {
    case 'span':
      let name = item.doc[SPAN_NAME][0];
      if (item.doc[SPAN_COMPOSITE_COUNT]?.[0]) {
        const compositePrefix =
          item.doc[SPAN_COMPOSITE_COMPRESSION_STRATEGY]?.[0] === 'exact_match' ? 'x' : '';
        name = `${item.doc[SPAN_COMPOSITE_COUNT][0]}${compositePrefix} ${name}`;
      }
      return (
        <EuiText style={{ overflow: 'hidden' }} size="s">
          <TruncateWithTooltip content={name} text={name} />
        </EuiText>
      );
    case 'transaction':
      return (
        <EuiTitle size="xxs">
          <h5>{item.doc[TRANSACTION_NAME][0]}</h5>
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
  const isCompositeSpan = item.docType === 'span' && item.doc[SPAN_COMPOSITE_COUNT]?.[0];

  const itemBarStyle = getItemBarStyle(item, color, width, left);

  const isServerlessColdstart = item.docType === 'transaction' && item.doc[FAAS_COLDSTART]?.[0];

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
        <HttpStatusCode item={item} />
        <NameLabel item={item} />

        <Duration item={item} />
        <RelatedErrors item={item} errorCount={errorCount} />
        {item.docType === 'span' && (
          <SyncBadge sync={item.doc[SPAN_SYNC]?.[0]} agentName={item.doc[AGENT_NAME][0]} />
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
  const theme = useTheme();
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/traces/explorer',
    '/dependencies/operation'
  );

  let kuery = `${TRACE_ID} : "${item.doc[TRACE_ID][0]}"`;
  if (item.doc[TRANSACTION_ID]?.[0]) {
    kuery += ` and ${TRANSACTION_ID} : "${item.doc[TRANSACTION_ID]?.[0]}"`;
  }

  const mobileHref = apmRouter.link(`/mobile-services/{serviceName}/errors-and-crashes`, {
    path: { serviceName: item.doc[SERVICE_NAME][0] },
    query: {
      ...query,
      serviceGroup: '',
      kuery,
    },
  });

  const href = apmRouter.link(`/services/{serviceName}/errors`, {
    path: { serviceName: item.doc[SERVICE_NAME][0] },
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
          href={isMobileAgentName(item.doc[AGENT_NAME][0]) ? mobileHref : href}
          color={theme.eui.euiColorDanger}
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

  return <FailureBadge outcome={item.doc[EVENT_OUTCOME]?.[0]} />;
}

function getItemBarStyle(
  item: IWaterfallSpanOrTransaction,
  color: string,
  width: number,
  left: number
): React.CSSProperties {
  let itemBarStyle = { left: `${left}%`, width: `${width}%` };

  if (item.docType === 'span' && item.doc[SPAN_COMPOSITE_COUNT]?.[0]) {
    const percNumItems = 100.0 / item.doc[SPAN_COMPOSITE_COUNT][0];
    const spanSumRatio = item.doc[SPAN_COMPOSITE_SUM]?.[0] / item.doc[SPAN_DURATION]?.[0];
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
