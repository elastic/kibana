/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useUrlParams } from '../../../../../../../context/url_params_context/use_url_params';
import { getNextEnvironmentUrlParam } from '../../../../../../../../common/environment_filter_values';
import {
  SERVICE_NAME,
  SPAN_NAME,
  TRANSACTION_NAME,
} from '../../../../../../../../common/elasticsearch_fieldnames';
import { NOT_AVAILABLE_LABEL } from '../../../../../../../../common/i18n';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { ServiceOrTransactionsOverviewLink } from '../../../../../../shared/Links/apm/service_transactions_overview_link';
import { TransactionDetailLink } from '../../../../../../shared/Links/apm/transaction_detail_link';
import { StickyProperties } from '../../../../../../shared/StickyProperties';

interface Props {
  span: Span;
  transaction?: Transaction;
}

export function StickySpanProperties({ span, transaction }: Props) {
  const {
    urlParams: { environment, latencyAggregationType },
  } = useUrlParams();

  const nextEnvironment = getNextEnvironmentUrlParam({
    requestedEnvironment: transaction?.service.environment,
    currentEnvironmentUrlParam: environment,
  });

  const spanName = span.span.name;
  const transactionStickyProperties = transaction
    ? [
        {
          label: i18n.translate('xpack.apm.transactionDetails.serviceLabel', {
            defaultMessage: 'Service',
          }),
          fieldName: SERVICE_NAME,
          val: (
            <ServiceOrTransactionsOverviewLink
              serviceName={transaction.service.name}
              environment={nextEnvironment}
            >
              {transaction.service.name}
            </ServiceOrTransactionsOverviewLink>
          ),
          width: '25%',
        },
        {
          label: i18n.translate(
            'xpack.apm.transactionDetails.transactionLabel',
            {
              defaultMessage: 'Transaction',
            }
          ),
          fieldName: TRANSACTION_NAME,
          val: (
            <TransactionDetailLink
              serviceName={transaction.service.name}
              transactionId={transaction.transaction.id}
              traceId={transaction.trace.id}
              transactionName={transaction.transaction.name}
              transactionType={transaction.transaction.type}
              environment={nextEnvironment}
              latencyAggregationType={latencyAggregationType}
            >
              {transaction.transaction.name}
            </TransactionDetailLink>
          ),
          width: '25%',
        },
      ]
    : [];

  const stickyProperties = [
    {
      label: i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.nameLabel',
        {
          defaultMessage: 'Name',
        }
      ),
      fieldName: SPAN_NAME,
      val: spanName || NOT_AVAILABLE_LABEL,
      truncated: true,
      width: '25%',
    },
    ...transactionStickyProperties,
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
