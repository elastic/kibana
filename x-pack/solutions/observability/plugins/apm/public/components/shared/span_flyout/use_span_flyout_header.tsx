/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { HttpStatusCode, Timestamp } from '@kbn/apm-ui-shared';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE, useUiTracker } from '@kbn/observability-shared-plugin/public';
import type { ReactElement } from 'react';
import React from 'react';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { getTimestampUs } from '../../../../common/utils/get_timestamp_us';
import type { Span } from '../../../../typings/es_schemas/ui/span';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { getFailureBadgeDescriptor } from '../badge/failure_badge';
import { getSyncBadgeDescriptor } from '../badge/sync_badge';
import { DependencyLink } from '../links/dependency_link';
import { TransactionDetailLink } from '../links/apm/transaction_detail_link';
import { ServiceLink } from '../links/apm/service_link';
import { CompositeSpanDurationSummaryItem } from '../summary/composite_span_duration_summary_item';
import { HttpInfoSummaryItem } from '../summary/http_info_summary_item';
import {
  DATE_LABEL,
  DURATION_LABEL,
  NAME_LABEL,
  REQUEST_LABEL,
  RESPONSE_LABEL,
  SERVICE_LABEL,
  TRANSACTION_LABEL,
} from '../waterfall_item_flyout/constants';
import { useWaterfallItemLinkParams } from '../waterfall_item_flyout/use_waterfall_item_link_params';
import { WaterfallItemDuration } from '../waterfall_item_flyout/waterfall_item_duration';

const { Badge, InfoBlock, MetaBlock } = FlyoutTemplate.Header;

export const SPAN_DETAILS_LABEL = i18n.translate(
  'xpack.apm.transactionDetails.spanFlyout.spanDetailsTitle',
  {
    defaultMessage: 'Span details',
  }
);

function formatType(type: string) {
  switch (type) {
    case 'db':
      return 'DB';
    case 'hard-navigation':
      return i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.spanType.navigationTimingLabel',
        {
          defaultMessage: 'Navigation timing',
        }
      );
    default:
      return type;
  }
}

function formatSubtype(subtype: string | undefined) {
  switch (subtype) {
    case 'mysql':
      return 'MySQL';
    default:
      return subtype;
  }
}

export interface SpanFlyoutHeaderParts {
  metaBlocks: ReactElement[];
  infoBlocks: ReactElement[];
  badges: ReactElement[];
}

/**
 * Resolves the waterfall span flyout header parts for `FlyoutTemplate.Header`: the span name and
 * request as meta blocks, the other summary fields as info blocks, and the status badges. The name
 * and request are meta blocks because they can be long, and a meta block spans the header width
 * where an info block gets a single grid cell.
 */
export function useSpanFlyoutHeader({
  span,
  parentTransaction,
  totalDuration,
}: {
  span?: Span;
  parentTransaction?: Transaction;
  totalDuration?: number;
}): SpanFlyoutHeaderParts {
  const { query, latencyAggregationType, serviceGroup, nextEnvironment } =
    useWaterfallItemLinkParams(parentTransaction?.service?.environment);
  const router = useApmRouter();
  const trackEvent = useUiTracker();
  const { euiTheme } = useEuiTheme();

  if (!span) {
    return { metaBlocks: [], infoBlocks: [], badges: [] };
  }

  const spanName = span.span?.name ?? NOT_AVAILABLE_LABEL;
  const dependencyName = span.span?.destination?.service?.resource;
  const transactionServiceName = parentTransaction?.service?.name;
  const transactionName = parentTransaction?.transaction?.name;
  const spanHttpUrl = span.url?.original || span.span?.http?.url?.original;
  const duration = span.span?.duration?.us;
  const composite = span.span?.composite;

  const metaBlocks: ReactElement[] = [
    <MetaBlock key="name" id="name" title={NAME_LABEL} data-test-subj="spanFlyoutInfo-name">
      {spanName}
    </MetaBlock>,
  ];

  if (spanHttpUrl) {
    const responseCode = span.http?.response?.status_code || span.span?.http?.response?.status_code;

    metaBlocks.push(
      <MetaBlock
        key="request"
        id="request"
        title={REQUEST_LABEL}
        data-test-subj="spanFlyoutInfo-request"
      >
        <HttpInfoSummaryItem
          method={span.http?.request?.method || span.span?.http?.method}
          url={spanHttpUrl}
          fitToContainer
        />
      </MetaBlock>
    );

    if (responseCode) {
      metaBlocks.push(
        <MetaBlock
          key="response"
          id="response"
          title={RESPONSE_LABEL}
          data-test-subj="spanFlyoutInfo-response"
        >
          <HttpStatusCode code={responseCode} showTooltip />
        </MetaBlock>
      );
    }
  }

  const infoBlocks: ReactElement[] = [];

  if (dependencyName) {
    infoBlocks.push(
      <InfoBlock
        key="dependency"
        id="dependency"
        title={i18n.translate('xpack.apm.transactionDetails.spanFlyout.dependencyLabel', {
          defaultMessage: 'Dependency',
        })}
        data-test-subj="spanFlyoutInfo-dependency"
      >
        <DependencyLink
          query={{ ...query, dependencyName }}
          subtype={span.span?.subtype}
          type={span.span?.type}
          onClick={() => {
            trackEvent({
              app: 'apm',
              metricType: METRIC_TYPE.CLICK,
              metric: 'span_flyout_to_dependency_detail',
            });
          }}
        />
      </InfoBlock>
    );
  }

  if (parentTransaction) {
    infoBlocks.push(
      <InfoBlock
        key="service"
        id="service"
        title={SERVICE_LABEL}
        data-test-subj="spanFlyoutInfo-service"
      >
        {transactionServiceName ? (
          <ServiceLink
            agentName={parentTransaction.agent?.name}
            query={{ ...query, serviceGroup, environment: nextEnvironment }}
            serviceName={transactionServiceName}
          />
        ) : (
          NOT_AVAILABLE_LABEL
        )}
      </InfoBlock>,
      <InfoBlock
        key="transaction"
        id="transaction"
        title={TRANSACTION_LABEL}
        data-test-subj="spanFlyoutInfo-transaction"
      >
        {transactionName && transactionServiceName ? (
          <TransactionDetailLink
            transactionName={transactionName}
            href={router.link('/services/{serviceName}/transactions/view', {
              path: { serviceName: transactionServiceName },
              query: {
                ...query,
                environment: nextEnvironment,
                serviceGroup,
                latencyAggregationType,
                transactionName,
              },
            })}
          >
            {transactionName}
          </TransactionDetailLink>
        ) : (
          transactionName ?? NOT_AVAILABLE_LABEL
        )}
      </InfoBlock>
    );
  }

  infoBlocks.push(
    <InfoBlock
      key="timestamp"
      id="timestamp"
      title={DATE_LABEL}
      data-test-subj="spanFlyoutInfo-timestamp"
    >
      <Timestamp timestamp={getTimestampUs(span) / 1000} renderMode="tooltip" />
    </InfoBlock>
  );

  if (duration !== undefined) {
    infoBlocks.push(
      <InfoBlock
        key="duration"
        id="duration"
        title={DURATION_LABEL}
        data-test-subj="spanFlyoutInfo-duration"
      >
        <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <WaterfallItemDuration
              duration={duration}
              parentDuration={totalDuration}
              parentType="transaction"
            />
          </EuiFlexItem>
          {composite && (
            <EuiFlexItem grow={false}>
              <CompositeSpanDurationSummaryItem
                count={composite.count}
                durationSum={composite.sum.us}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </InfoBlock>
    );
  }

  const type = span.span?.type;
  const action = span.span?.action;
  const spanSubtype = formatSubtype(span.span?.subtype);

  const badges: ReactElement[] = [];

  if (type) {
    badges.push(
      <Badge
        key="type"
        id="type"
        color="hollow"
        toolTipContent={i18n.translate('xpack.apm.transactionDetails.spanFlyout.spanType', {
          defaultMessage: 'Type',
        })}
        data-test-subj="spanFlyoutBadge-type"
      >
        {formatType(type)}
      </Badge>
    );
  }

  if (spanSubtype) {
    badges.push(
      <Badge
        key="subtype"
        id="subtype"
        color="hollow"
        toolTipContent={i18n.translate('xpack.apm.transactionDetails.spanFlyout.spanSubtype', {
          defaultMessage: 'Subtype',
        })}
        data-test-subj="spanFlyoutBadge-subtype"
      >
        {spanSubtype}
      </Badge>
    );
  }

  if (action) {
    badges.push(
      <Badge
        key="action"
        id="action"
        color="hollow"
        toolTipContent={i18n.translate('xpack.apm.transactionDetails.spanFlyout.spanAction', {
          defaultMessage: 'Action',
        })}
        data-test-subj="spanFlyoutBadge-action"
      >
        {action}
      </Badge>
    );
  }

  const failure = getFailureBadgeDescriptor(span.event?.outcome, euiTheme);
  if (failure) {
    badges.push(
      <Badge
        key="failure"
        id="failure"
        color={failure.color}
        toolTipContent={failure.toolTipContent}
        data-test-subj="spanFlyoutBadge-failure"
      >
        {failure.label}
      </Badge>
    );
  }

  const sync = getSyncBadgeDescriptor({ sync: span.span?.sync, agentName: span.agent?.name });
  if (sync) {
    badges.push(
      <Badge
        key="sync"
        id="sync"
        toolTipContent={sync.toolTipContent}
        data-test-subj="spanFlyoutBadge-sync"
      >
        {sync.label}
      </Badge>
    );
  }

  return { metaBlocks, infoBlocks, badges };
}
