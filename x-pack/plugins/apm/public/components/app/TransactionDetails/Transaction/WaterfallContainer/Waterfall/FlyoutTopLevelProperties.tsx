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
// @ts-ignore
import { StickyProperties } from 'x-pack/plugins/apm/public/components/shared/StickyProperties';
import { TraceLink } from 'x-pack/plugins/apm/public/components/shared/TraceLink';
import {
  KibanaLink,
  legacyEncodeURIComponent
} from 'x-pack/plugins/apm/public/utils/url';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';

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
        <TraceLink transaction={transaction}>
          {transaction.transaction.name}
        </TraceLink>
      ),
      width: '50%'
    }
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
