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
import {
  KibanaLink,
  legacyEncodeURIComponent
  // @ts-ignore
} from 'x-pack/plugins/apm/public/utils/url';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
// @ts-ignore
import { StickyProperties } from '../../../../../shared/StickyProperties';

interface Props {
  transaction: Transaction;
}

export function FlyoutTopLevelProperties({ transaction }: Props) {
  const stickyProperties = [
    {
      label: 'Service',
      fieldName: SERVICE_NAME,
      val: (
        <KibanaLink
          pathname={'/app/apm'}
          hash={`/${transaction.context.service.name}`}
        >
          {transaction.context.service.name}
        </KibanaLink>
      ),
      width: '50%'
    },
    {
      label: 'Transaction',
      fieldName: TRANSACTION_NAME,
      val: (
        <KibanaLink
          pathname={'/app/apm'}
          hash={`/${transaction.context.service.name}/transactions/${
            transaction.transaction.type
          }/${legacyEncodeURIComponent(transaction.transaction.name)}`}
        >
          {transaction.transaction.name}
        </KibanaLink>
      ),
      width: '50%'
    }
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
