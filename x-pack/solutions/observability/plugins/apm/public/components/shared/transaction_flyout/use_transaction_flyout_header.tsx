/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { Duration, Timestamp } from '@kbn/apm-ui-shared';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { useApmRouter } from '../../../hooks/use_apm_router';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
  getNextEnvironmentUrlParam,
} from '../../../../common/environment_filter_values';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { getTimestampUs } from '../../../../common/utils/get_timestamp_us';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { TransactionDetailLink } from '../links/apm/transaction_detail_link';
import { ServiceLink } from '../links/apm/service_link';
import { getErrorCountBadgeDescriptor } from '../summary/error_count_summary_item_badge';
import { HttpInfoSummaryItem } from '../summary/http_info_summary_item';
import { getTransactionResultBadgeDescriptor } from '../summary/transaction_result_summary_item';
import { getTransactionUrl } from '../summary/transaction_summary';
import {
  DURATION_LABEL,
  REQUEST_LABEL,
  SERVICE_LABEL,
  TIMESTAMP_LABEL,
} from '../waterfall_item_flyout/constants';

const { Badge, MetaBlock } = FlyoutTemplate.Header;

export const TRANSACTION_DETAILS_LABEL = i18n.translate(
  'xpack.apm.transactionDetails.transFlyout.transactionDetailsTitle',
  {
    defaultMessage: 'Transaction details',
  }
);

const USER_AGENT_LABEL = i18n.translate('xpack.apm.transactionDetails.userAgentAndVersionLabel', {
  defaultMessage: 'User agent & version',
});

const COLD_START_LABEL = i18n.translate('xpack.apm.transactionFlyout.coldStartBadge', {
  defaultMessage: 'cold start',
});

export interface TransactionFlyoutHeaderParts {
  title: ReactNode;
  titleText: string;
  description?: string;
  metaBlocks: ReactElement[];
  badges: ReactElement[];
}

/**
 * Resolves the waterfall transaction flyout header for `FlyoutTemplate.Header`. Until the document
 * loads, the title is the generic "Transaction details" label; afterwards the title links to the
 * transaction page and the generic label becomes the description.
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
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation'
  );
  const { link } = useApmRouter();
  const { euiTheme } = useEuiTheme();

  if (!transaction) {
    return {
      title: TRANSACTION_DETAILS_LABEL,
      titleText: TRANSACTION_DETAILS_LABEL,
      metaBlocks: [],
      badges: [],
    };
  }

  const latencyAggregationType =
    ('latencyAggregationType' in query && query.latencyAggregationType) ||
    LatencyAggregationType.avg;
  const serviceGroup = ('serviceGroup' in query && query.serviceGroup) || '';

  const nextEnvironment = getNextEnvironmentUrlParam({
    requestedEnvironment: transaction.service?.environment ?? ENVIRONMENT_NOT_DEFINED.value,
    currentEnvironmentUrlParam: query?.environment ?? ENVIRONMENT_ALL.value,
  });

  const serviceName = transaction.service?.name;
  const agentName = transaction.agent?.name;
  const transactionName = transaction.transaction?.name;
  const transactionType = transaction.transaction?.type;

  const title =
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
  const userAgent = transaction.user_agent;

  const metaBlocks = [
    <MetaBlock
      key="service"
      id="service"
      title={SERVICE_LABEL}
      data-test-subj="transactionFlyoutMeta-service"
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
    </MetaBlock>,
    <MetaBlock
      key="timestamp"
      id="timestamp"
      title={TIMESTAMP_LABEL}
      data-test-subj="transactionFlyoutMeta-timestamp"
    >
      <Timestamp timestamp={getTimestampUs(transaction) / 1000} renderMode="tooltip" />
    </MetaBlock>,
    <MetaBlock
      key="duration"
      id="duration"
      title={DURATION_LABEL}
      data-test-subj="transactionFlyoutMeta-duration"
    >
      <Duration
        duration={transaction.transaction.duration.us}
        parent={{ duration: rootTransactionDuration, type: 'trace' }}
      />
    </MetaBlock>,
  ];

  if (url) {
    metaBlocks.push(
      <MetaBlock
        key="request"
        id="request"
        title={REQUEST_LABEL}
        data-test-subj="transactionFlyoutMeta-request"
      >
        <HttpInfoSummaryItem
          method={transaction.http?.request?.method}
          status={transaction.http?.response?.status_code}
          url={url}
        />
      </MetaBlock>
    );
  }

  if (userAgent) {
    metaBlocks.push(
      <MetaBlock
        key="userAgent"
        id="userAgent"
        title={USER_AGENT_LABEL}
        data-test-subj="transactionFlyoutMeta-userAgent"
      >
        {userAgent.version ? `${userAgent.name} (${userAgent.version})` : userAgent.name}
      </MetaBlock>
    );
  }

  const badges: ReactElement[] = [];
  const result = transaction.transaction.result;

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
        {COLD_START_LABEL}
      </Badge>
    );
  }

  return {
    title,
    titleText: transactionName ?? NOT_AVAILABLE_LABEL,
    description: TRANSACTION_DETAILS_LABEL,
    metaBlocks,
    badges,
  };
}
