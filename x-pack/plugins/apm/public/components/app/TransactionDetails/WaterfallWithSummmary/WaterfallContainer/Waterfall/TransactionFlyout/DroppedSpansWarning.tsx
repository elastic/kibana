/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { ElasticDocsLink } from '../../../../../../shared/Links/ElasticDocsLink';

export function DroppedSpansWarning({
  transactionDoc,
}: {
  transactionDoc: Transaction;
}) {
  const dropped = transactionDoc.transaction.span_count?.dropped;
  if (!dropped) {
    return null;
  }

  return (
    <React.Fragment>
      <EuiCallOut size="s">
        {i18n.translate(
          'xpack.apm.transactionDetails.transFlyout.callout.agentDroppedSpansMessage',
          {
            defaultMessage:
              'The APM agent that reported this transaction dropped {dropped} spans or more based on its configuration.',
            values: { dropped },
          }
        )}{' '}
        <ElasticDocsLink
          section="/apm/get-started"
          path="/transaction-spans.html#dropped-spans"
          target="_blank"
        >
          {i18n.translate(
            'xpack.apm.transactionDetails.transFlyout.callout.learnMoreAboutDroppedSpansLinkText',
            {
              defaultMessage: 'Learn more about dropped spans.',
            }
          )}
        </ElasticDocsLink>
      </EuiCallOut>
      <EuiHorizontalRule />
    </React.Fragment>
  );
}
