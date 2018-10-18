/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import {
  REQUEST_URL_FULL,
  TRANSACTION_DURATION,
  TRANSACTION_RESULT,
  USER_ID
} from '../../../../../common/constants';
import { Transaction } from '../../../../../typings/Transaction';
// @ts-ignore
import { asTime } from '../../../../utils/formatters';
// @ts-ignore
import { StickyProperties } from '../../../shared/StickyProperties';

interface Props {
  transaction: Transaction;
}

export function StickyTransactionProperties({ transaction }: Props) {
  const timestamp = get(transaction, '@timestamp');
  const url = get(transaction, REQUEST_URL_FULL, 'N/A');
  const duration = get(transaction, TRANSACTION_DURATION);
  const stickyProperties = [
    {
      label: 'Timestamp',
      fieldName: '@timestamp',
      val: timestamp
    },
    {
      fieldName: REQUEST_URL_FULL,
      label: 'URL',
      val: url,
      truncated: true
    },
    {
      label: 'Duration',
      fieldName: TRANSACTION_DURATION,
      val: duration ? asTime(duration) : 'N/A'
    },
    {
      label: 'Result',
      fieldName: TRANSACTION_RESULT,
      val: get(transaction, TRANSACTION_RESULT, 'N/A')
    },
    {
      label: 'User ID',
      fieldName: USER_ID,
      val: get(transaction, USER_ID, 'N/A')
    }
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
