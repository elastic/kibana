/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { COLD_START_BADGE_LABEL, HttpStatusCode, Timestamp } from '@kbn/apm-ui-shared';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import type { ReactElement } from 'react';
import React from 'react';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { getTimestampUs } from '../../../../common/utils/get_timestamp_us';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { TransactionDetailLink } from '../links/apm/transaction_detail_link';
import { ServiceLink } from '../links/apm/service_link';
import { getErrorCountBadgeDescriptor } from '../summary/error_count_summary_item_badge';
import { HttpInfoSummaryItem } from '../summary/http_info_summary_item';
import { getTransactionResultBadgeDescriptor } from '../summary/transaction_result_summary_item';
import { getTransactionUrl } from '../summary/transaction_summary';
import {
  DATE_LABEL,
  DURATION_LABEL,
  REQUEST_LABEL,
  RESPONSE_LABEL,
  SERVICE_LABEL,
  TRANSACTION_LABEL,
} from '../waterfall_item_flyout/constants';
import { useWaterfallItemLinkParams } from '../waterfall_item_flyout/use_waterfall_item_link_params';
import { WaterfallItemDuration } from '../waterfall_item_flyout/waterfall_item_duration';

const { Badge, InfoBlock, MetaBlock } = FlyoutTemplate.Header;

export const TRANSACTION_DETAILS_LABEL = i18n.translate(
  'xpack.apm.transactionDetails.transFlyout.transactionDetailsTitle',
  {
    defaultMessage: 'Transaction details',
  }
);

const USER_AGENT_LABEL = i18n.translate('xpack.apm.transactionDetails.userAgentAndVersionLabel', {
  defaultMessage: 'User agent & version',
});

export interface TransactionFlyoutHeaderParts {
  metaBlocks: ReactElement[];
  infoBlocks: ReactElement[];
  badges: ReactElement[];
}

/**
 * Resolves the waterfall transaction flyout header parts for `FlyoutTemplate.Header`: the
 * transaction name and request as meta blocks, the other summary fields as info blocks, and the
 * status badges. The name and request are meta blocks because they can be long, and a meta block
 * spans the header width where an info block gets a single grid cell.
 */
export function useTransactionFlyoutHeader({
  transaction,
  errorCount,
  rootTransactionDuration,
}: {
  transaction?: Transaction;
  errorCount: number;
  rootTransactionDuration?: number;
}): TransactionFlyoutHeaderParts {
  const { query, latencyAggregationType, serviceGroup, nextEnvironment } =
    useWaterfallItemLinkParams(transaction?.service?.environment);
  const { link } = useApmRouter();
  const { euiTheme } = useEuiTheme();

  if (!transaction) {
    return { metaBlocks: [], infoBlocks: [], badges: [] };
  }

  const serviceName = transaction.service?.name;
  const agentName = transaction.agent?.name;
  const transactionName = transaction.transaction?.name;
  const transactionType = transaction.transaction?.type;

  const name =
    transactionName && serviceName ? (
      <TransactionDetailLink
        transactionName={transactionName}
        href={link('/services/{serviceName}/transactions/view', {
          path: { serviceName },
          query: {
            ...query,
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
    );

  const url = getTransactionUrl(transaction);
  const userAgent = [
    transaction.user_agent?.name,
    transaction.user_agent?.version && `(${transaction.user_agent.version})`,
  ]
    .filter(Boolean)
    .join(' ');
  const duration = transaction.transaction?.duration?.us;

  const metaBlocks = [
    <MetaBlock
      key="name"
      id="name"
      title={TRANSACTION_LABEL}
      data-test-subj="transactionFlyoutInfo-name"
    >
      {name}
    </MetaBlock>,
  ];

  const responseCode = transaction.http?.response?.status_code;

  if (url) {
    metaBlocks.push(
      <MetaBlock
        key="request"
        id="request"
        title={REQUEST_LABEL}
        data-test-subj="transactionFlyoutInfo-request"
      >
        <HttpInfoSummaryItem method={transaction.http?.request?.method} url={url} fitToContainer />
      </MetaBlock>
    );

    if (responseCode) {
      metaBlocks.push(
        <MetaBlock
          key="response"
          id="response"
          title={RESPONSE_LABEL}
          data-test-subj="transactionFlyoutInfo-response"
        >
          <HttpStatusCode code={responseCode} showTooltip />
        </MetaBlock>
      );
    }
  }

  const infoBlocks = [
    <InfoBlock
      key="service"
      id="service"
      title={SERVICE_LABEL}
      data-test-subj="transactionFlyoutInfo-service"
    >
      {serviceName ? (
        <ServiceLink
          agentName={agentName}
          query={{
            kuery: query.kuery,
            latencyAggregationType,
            offset: query.offset,
            rangeFrom: query.rangeFrom,
            rangeTo: query.rangeTo,
            comparisonEnabled: query.comparisonEnabled,
            transactionType,
            serviceGroup,
            environment: nextEnvironment,
          }}
          serviceName={serviceName}
        />
      ) : (
        NOT_AVAILABLE_LABEL
      )}
    </InfoBlock>,
    <InfoBlock
      key="timestamp"
      id="timestamp"
      title={DATE_LABEL}
      data-test-subj="transactionFlyoutInfo-timestamp"
    >
      <Timestamp timestamp={getTimestampUs(transaction) / 1000} renderMode="tooltip" />
    </InfoBlock>,
  ];

  if (duration !== undefined) {
    infoBlocks.push(
      <InfoBlock
        key="duration"
        id="duration"
        title={DURATION_LABEL}
        data-test-subj="transactionFlyoutInfo-duration"
      >
        <WaterfallItemDuration
          duration={duration}
          parentDuration={rootTransactionDuration}
          parentType="trace"
        />
      </InfoBlock>
    );
  }

  if (userAgent) {
    infoBlocks.push(
      <InfoBlock
        key="userAgent"
        id="userAgent"
        title={USER_AGENT_LABEL}
        data-test-subj="transactionFlyoutInfo-userAgent"
      >
        {userAgent}
      </InfoBlock>
    );
  }

  const badges: ReactElement[] = [];
  const result = transaction.transaction?.result;

  if (!url && result) {
    const descriptor = getTransactionResultBadgeDescriptor(result);
    badges.push(
      <Badge
        key="result"
        id="result"
        color={descriptor.color}
        toolTipContent={descriptor.toolTipContent}
        data-test-subj="transactionFlyoutBadge-result"
      >
        {descriptor.label}
      </Badge>
    );
  }

  if (errorCount) {
    const descriptor = getErrorCountBadgeDescriptor(errorCount, euiTheme);
    badges.push(
      <Badge
        key="errorCount"
        id="errorCount"
        color={descriptor.color}
        data-test-subj="transactionFlyoutBadge-errorCount"
      >
        {descriptor.label}
      </Badge>
    );
  }

  if (transaction.faas?.coldstart) {
    badges.push(
      <Badge
        key="coldStart"
        id="coldStart"
        color="warning"
        data-test-subj="transactionFlyoutBadge-coldStart"
      >
        {COLD_START_BADGE_LABEL}
      </Badge>
    );
  }

  return { metaBlocks, infoBlocks, badges };
}
