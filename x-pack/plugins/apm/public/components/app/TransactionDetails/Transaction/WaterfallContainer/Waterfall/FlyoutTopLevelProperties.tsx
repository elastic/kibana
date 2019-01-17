/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  SERVICE_NAME,
  TRANSACTION_NAME
} from 'x-pack/plugins/apm/common/constants';
import { KibanaLink } from 'x-pack/plugins/apm/public/components/shared/Links/KibanaLink';
import { StickyProperties } from 'x-pack/plugins/apm/public/components/shared/StickyProperties';
import { TransactionLink } from 'x-pack/plugins/apm/public/components/shared/TransactionLink';
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
      label: 'Service',
      fieldName: SERVICE_NAME,
      val: (
        <KibanaLink hash={`/${transaction.context.service.name}`}>
          {transaction.context.service.name}
        </KibanaLink>
      ),
      width: '50%'
    },
    {
      label: 'Transaction',
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
