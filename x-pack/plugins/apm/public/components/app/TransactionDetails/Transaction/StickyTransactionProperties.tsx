/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { idx } from '@kbn/elastic-idx';
import {
  TRANSACTION_DURATION,
  TRANSACTION_RESULT,
  URL_FULL,
  USER_ID
} from '../../../../../common/elasticsearch_fieldnames';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { asPercent, asTime } from '../../../../utils/formatters';
import {
  IStickyProperty,
  StickyProperties
} from '../../../shared/StickyProperties';
import { ErrorCountBadge } from './ErrorCountBadge';

interface Props {
  transaction: Transaction;
  totalDuration?: number;
  errorCount?: number;
}

export function StickyTransactionProperties({
  transaction,
  totalDuration,
  errorCount
}: Props) {
  const timestamp = transaction['@timestamp'];
  const url =
    idx(transaction, _ => _.context.page.url) ||
    idx(transaction, _ => _.url.full) ||
    NOT_AVAILABLE_LABEL;
  const duration = transaction.transaction.duration.us;

  const noErrorsText = i18n.translate(
    'xpack.apm.transactionDetails.errorsNone',
    {
      defaultMessage: 'None'
    }
  );

  const stickyProperties: IStickyProperty[] = [
    {
      label: i18n.translate('xpack.apm.transactionDetails.timestampLabel', {
        defaultMessage: 'Timestamp'
      }),
      fieldName: '@timestamp',
      val: timestamp,
      truncated: true,
      width: '50%'
    },
    {
      fieldName: URL_FULL,
      label: 'URL',
      val: url,
      truncated: true,
      width: '50%'
    },
    {
      label: i18n.translate('xpack.apm.transactionDetails.durationLabel', {
        defaultMessage: 'Duration'
      }),
      fieldName: TRANSACTION_DURATION,
      val: asTime(duration),
      width: '25%'
    },
    {
      label: i18n.translate(
        'xpack.apm.transactionDetails.percentOfTraceLabel',
        {
          defaultMessage: '% of trace'
        }
      ),
      val: asPercent(duration, totalDuration, NOT_AVAILABLE_LABEL),
      width: '25%'
    },
    {
      label: i18n.translate('xpack.apm.transactionDetails.resultLabel', {
        defaultMessage: 'Result'
      }),
      fieldName: TRANSACTION_RESULT,
      val: idx(transaction, _ => _.transaction.result) || NOT_AVAILABLE_LABEL,
      width: '14%'
    },
    {
      label: i18n.translate(
        'xpack.apm.transactionDetails.errorsOverviewLabel',
        {
          defaultMessage: 'Errors'
        }
      ),
      val: errorCount ? (
        <ErrorCountBadge
          errorCount={errorCount}
          transaction={transaction}
          verbose
        />
      ) : (
        noErrorsText
      ),
      width: '18%'
    },
    {
      label: i18n.translate('xpack.apm.transactionDetails.userIdLabel', {
        defaultMessage: 'User ID'
      }),
      fieldName: USER_ID,
      val: idx(transaction, _ => _.user.id) || NOT_AVAILABLE_LABEL,
      truncated: true,
      width: '18%'
    }
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
