/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiHorizontalRule, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { idx } from '../../../../../../../../common/idx';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/Transaction';
import { DROPPED_SPANS_DOCS } from '../../../../../../../utils/documentation/apm-get-started';

export function DroppedSpansWarning({
  transactionDoc
}: {
  transactionDoc: Transaction;
}) {
  const dropped = idx(transactionDoc, _ => _.transaction.span_count.dropped);
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
            values: { dropped }
          }
        )}{' '}
        <EuiLink href={DROPPED_SPANS_DOCS} target="_blank">
          {i18n.translate(
            'xpack.apm.transactionDetails.transFlyout.callout.learnMoreAboutDroppedSpansLinkText',
            {
              defaultMessage: 'Learn more about dropped spans.'
            }
          )}
        </EuiLink>
      </EuiCallOut>
      <EuiHorizontalRule />
    </React.Fragment>
  );
}
