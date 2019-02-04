/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { NOT_AVAILABLE_LABEL } from 'x-pack/plugins/apm/common/i18n';
import { idx } from 'x-pack/plugins/apm/common/idx';
import { KibanaLink } from 'x-pack/plugins/apm/public/components/shared/Links/KibanaLink';
import { legacyEncodeURIComponent } from 'x-pack/plugins/apm/public/components/shared/Links/url_helpers';
import {
  TRANSACTION_DURATION,
  TRANSACTION_RESULT,
  URL_FULL,
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
      width: '25%'
    },
    {
      label: i18n.translate('xpack.apm.transactionDetails.userIdLabel', {
        defaultMessage: 'User ID'
      }),
      fieldName: USER_ID,
      val: idx(transaction, _ => _.user.id) || NOT_AVAILABLE_LABEL,
      truncated: true,
      width: '25%'
    }
  ];

  if (errorCount !== undefined) {
    const errorsOverviewLink = (
      <KibanaLink
        pathname={'/app/apm'}
        hash={`/${idx(transaction, _ => _.service.name)}/errors`}
        query={{
          kuery: legacyEncodeURIComponent(
            `transaction.id : "${transaction.transaction.id}"`
          )
        }}
      >
        {i18n.translate('xpack.apm.transactionDetails.errorsOverviewLink', {
          values: { errorCount },
          defaultMessage:
            '{errorCount, plural, one {View 1 error} other {View # errors}}'
        })}
      </KibanaLink>
    );

    const noErrorsText = i18n.translate(
      'xpack.apm.transactionDetails.errorsNone',
      {
        defaultMessage: 'None'
      }
    );

    stickyProperties.push({
      label: i18n.translate(
        'xpack.apm.transactionDetails.errorsOverviewLabel',
        {
          defaultMessage: 'Errors'
        }
      ),
      val: errorCount === 0 ? noErrorsText : errorsOverviewLink,
      width: '25%'
    });
  }

  return <StickyProperties stickyProperties={stickyProperties} />;
}
