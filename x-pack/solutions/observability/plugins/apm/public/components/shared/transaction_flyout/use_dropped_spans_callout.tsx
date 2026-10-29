/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import type { ReactElement } from 'react';
import React from 'react';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

/** Resolves the `Body.Callout` warning that the agent dropped spans from this transaction. */
export function useDroppedSpansCallout(transaction?: Transaction): ReactElement | null {
  const { docLinks } = useApmPluginContext().core;
  const dropped = transaction?.transaction?.span_count?.dropped;
  if (!dropped) {
    return null;
  }

  return (
    <FlyoutTemplate.Body.Callout
      level="info"
      title={i18n.translate(
        'xpack.apm.transactionDetails.transFlyout.callout.agentDroppedSpansMessage',
        {
          defaultMessage:
            'The APM agent that reported this transaction dropped {dropped} spans or more based on its configuration.',
          values: { dropped },
        }
      )}
      data-test-subj="transactionFlyoutDroppedSpansCallout"
    >
      <EuiLink
        data-test-subj="apmDroppedSpansWarningLearnMoreAboutDroppedSpansLink"
        href={docLinks.links.apm.droppedTransactionSpans}
      >
        {i18n.translate(
          'xpack.apm.transactionDetails.transFlyout.callout.learnMoreAboutDroppedSpansLinkText',
          {
            defaultMessage: 'Learn more about dropped spans.',
          }
        )}
      </EuiLink>
    </FlyoutTemplate.Body.Callout>
  );
}
