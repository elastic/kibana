/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiHorizontalRule, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { useApmPluginContext } from '../../../../../../../context/apm_plugin/use_apm_plugin_context';

export function DroppedSpansWarning({
  transactionDoc,
}: {
  transactionDoc: Transaction;
}) {
  const { docLinks } = useApmPluginContext().core;
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
        <EuiLink href={docLinks.links.apm.droppedTransactionSpans}>
          {i18n.translate(
            'xpack.apm.transactionDetails.transFlyout.callout.learnMoreAboutDroppedSpansLinkText',
            {
              defaultMessage: 'Learn more about dropped spans.',
            }
          )}
        </EuiLink>
      </EuiCallOut>
      <EuiHorizontalRule />
    </React.Fragment>
  );
}
