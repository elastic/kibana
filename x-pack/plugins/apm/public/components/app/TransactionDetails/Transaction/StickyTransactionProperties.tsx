/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
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
      val: timestamp,
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
      val: duration ? asTime(duration) : 'N/A',
      width: '25%'
    },
    {
      label: '% of trace duration',
      val: 'tbd',
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
      width: '25%'
    }
  ];

  const flexGroupProps = {
    gutterSize: 'none'
  };

  return (
    <div style={{ marginTop: '-1em', marginBottom: '-1em' }}>
      <StickyProperties
        stickyProperties={stickyProperties}
        groupProps={flexGroupProps}
      />
    </div>
  );
}
