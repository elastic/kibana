/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  SERVICE_NAME,
  TRANSACTION_NAME
} from 'x-pack/plugins/apm/common/constants';
import { KibanaLink } from 'x-pack/plugins/apm/public/components/shared/Links/KibanaLink';
import { TransactionLink } from 'x-pack/plugins/apm/public/components/shared/Links/TransactionLink';
import { StickyProperties } from 'x-pack/plugins/apm/public/components/shared/StickyProperties';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';

interface Props {
  transaction?: Transaction;
}

export function FlyoutTopLevelProperties({ transaction }: Props) {
  if (!transaction) {
    return null;
  }

  const stickyProperties = [
    {
      label: i18n.translate('xpack.apm.transactionDetails.serviceLabel', {
        defaultMessage: 'Service'
      }),
      fieldName: SERVICE_NAME,
      val: (
        <KibanaLink hash={`/${transaction.service.name}`}>
          {transaction.service.name}
        </KibanaLink>
      ),
      width: '50%'
    },
    {
      label: i18n.translate('xpack.apm.transactionDetails.transactionLabel', {
        defaultMessage: 'Transaction'
      }),
      fieldName: TRANSACTION_NAME,
      val: (
        <TransactionLink transaction={transaction}>
          {transaction.transaction.name}
        </TransactionLink>
      ),
      width: '50%'
    }
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
