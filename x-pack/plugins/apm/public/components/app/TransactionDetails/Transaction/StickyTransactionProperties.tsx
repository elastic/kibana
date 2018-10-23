/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { selectWaterfallRoot } from 'x-pack/plugins/apm/public/store/selectors/waterfall';
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

function getDurationPercent(
  transactionDuration: number,
  rootDuration?: number
) {
  if (rootDuration === undefined || rootDuration === 0) {
    return '';
  }
  return ((transactionDuration / rootDuration) * 100).toFixed(2) + '%';
}

interface Props {
  transaction: Transaction;
  root?: Transaction;
}

export function StickyTransactionPropertiesComponent({
  transaction,
  root
}: Props) {
  const timestamp = get(transaction, '@timestamp');
  const url = get(transaction, REQUEST_URL_FULL, 'N/A');
  const duration = transaction.transaction.duration.us;
  const rootDuration = root && root.transaction.duration.us;
  const stickyProperties = [
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
      val: duration ? asTime(duration) : 'N/A',
      width: '25%'
    },
    {
      label: '% of trace',
      val: getDurationPercent(duration, rootDuration),
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

const mapStateToProps = (state: any, props: Partial<Props>) => ({
  root: selectWaterfallRoot(state, props)
});

export const StickyTransactionProperties = connect<{}, {}, Props>(
  mapStateToProps
)(StickyTransactionPropertiesComponent);
