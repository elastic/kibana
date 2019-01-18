/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import idx from 'idx';
import { get } from 'lodash';
import React from 'react';
import {
  REQUEST_URL_FULL,
  TRANSACTION_DURATION,
  TRANSACTION_RESULT,
  USER_ID
} from '../../../../../common/constants';
import { Transaction } from '../../../../../typings/es_schemas/Transaction';
import { asPercent, asTime } from '../../../../utils/formatters';
import {
  IStickyProperty,
  StickyProperties
} from '../../../shared/StickyProperties';

interface Props {
  transaction: Transaction;
  totalDuration?: number;
}

export function StickyTransactionProperties({
  transaction,
  totalDuration
}: Props) {
  const timestamp = transaction['@timestamp'];

  const url =
    idx(transaction, _ => _.context.page.url) ||
    idx(transaction, _ => _.context.request.url.full) ||
    'N/A';
  const duration = transaction.transaction.duration.us;
  const stickyProperties: IStickyProperty[] = [
    {
      label: 'Timestamp',
      fieldName: '@timestamp',
      val: timestamp,
      truncated: true,
      width: '50%'
    },
    {
      fieldName: REQUEST_URL_FULL,
      label: 'URL',
      val: url,
      truncated: true,
      width: '50%'
    },
    {
      label: 'Duration',
      fieldName: TRANSACTION_DURATION,
      val: asTime(duration),
      width: '25%'
    },
    {
      label: '% of trace',
      val: asPercent(duration, totalDuration, 'N/A'),
      width: '25%'
    },
    {
      label: 'Result',
      fieldName: TRANSACTION_RESULT,
      val: get(transaction, TRANSACTION_RESULT, 'N/A'),
      width: '25%'
    },
    {
      label: 'User ID',
      fieldName: USER_ID,
      val: get(transaction, USER_ID, 'N/A'),
      truncated: true,
      width: '25%'
    }
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
