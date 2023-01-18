/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const txGroupsDroppedBucketName = '_other';

export function TransactionDetailMaxGroupsMessage() {
  return (
    <FormattedMessage
      defaultMessage="The transaction group limit in APM Server has been reached. Excess groups have been captured in _other. Please see the {apmServerDocs} for {codeBlock} to increase this limit."
      id="xpack.apm.transactionDetail.maxGroups.message"
      values={{
        apmServerDocs: (
          <EuiLink
            href={
              'https://www.elastic.co/guide/en/apm/guide/current/transaction-metrics.html#transactions-max_groups'
            }
            target="_blank"
          >
            {i18n.translate(
              'xpack.apm.transactionDetail.maxGroups.apmServerDocs',
              {
                defaultMessage: 'APM Server docs',
              }
            )}
          </EuiLink>
        ),
        codeBlock: <EuiCode>aggregation.transaction.max_groups</EuiCode>,
      }}
    />
  );
}
