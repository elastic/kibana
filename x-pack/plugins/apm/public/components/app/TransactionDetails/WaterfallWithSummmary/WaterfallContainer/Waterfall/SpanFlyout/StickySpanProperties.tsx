/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import {
  SPAN_NAME,
  TRANSACTION_NAME,
  SERVICE_NAME,
} from '../../../../../../../../common/elasticsearch_fieldnames';
import { NOT_AVAILABLE_LABEL } from '../../../../../../../../common/i18n';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import { StickyProperties } from '../../../../../../shared/StickyProperties';
import { TransactionOverviewLink } from '../../../../../../shared/Links/apm/TransactionOverviewLink';
import { TransactionDetailLink } from '../../../../../../shared/Links/apm/TransactionDetailLink';

interface Props {
  span: Span;
  transaction?: Transaction;
}

export function StickySpanProperties({ span, transaction }: Props) {
  const spanName = span.span.name;
  const transactionStickyProperties = transaction
    ? [
        {
          label: i18n.translate('xpack.apm.transactionDetails.serviceLabel', {
            defaultMessage: 'Service',
          }),
          fieldName: SERVICE_NAME,
          val: (
            <TransactionOverviewLink serviceName={transaction.service.name}>
              {transaction.service.name}
            </TransactionOverviewLink>
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
