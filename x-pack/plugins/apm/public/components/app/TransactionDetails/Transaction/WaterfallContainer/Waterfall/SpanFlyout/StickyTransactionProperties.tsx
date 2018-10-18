/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// import styled from 'styled-components';

// @ts-ignore
import {
  SERVICE_NAME,
  TRANSACTION_NAME
} from 'x-pack/plugins/apm/common/constants';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
// @ts-ignore
import { StickyProperties } from '../../../../../../shared/StickyProperties';

interface Props {
  transaction: Transaction;
}

export function StickyTransactionProperties({ transaction }: Props) {
  const stickyProperties = [
    {
      label: 'Service',
      fieldName: SERVICE_NAME,
      val: transaction.context.service.name
    },
    {
      label: 'Transaction',
      fieldName: TRANSACTION_NAME,
      val: transaction.transaction.name
    }
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
