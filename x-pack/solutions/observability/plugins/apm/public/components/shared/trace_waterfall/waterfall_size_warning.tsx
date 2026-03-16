/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface WaterfallSizeWarningProps {
  traceDocsTotal: number;
  maxTraceItems: number;
  discoverHref?: string;
  'data-test-subj'?: string;
}

export function WaterfallSizeWarning({
  traceDocsTotal,
  maxTraceItems,
  discoverHref,
  'data-test-subj': dataTestSubj = 'waterfallSizeWarning',
}: WaterfallSizeWarningProps) {
  return (
    <EuiCallOut
      announceOnMount
      data-test-subj={dataTestSubj}
      color="warning"
      size="s"
      iconType="warning"
      title={
        discoverHref ? (
          <FormattedMessage
            id="xpack.apm.waterfall.exceedsMax.withDiscoverLink"
            defaultMessage="The number of items in this trace is {traceDocsTotal} which is higher than the current limit of {maxTraceItems}. Please increase the limit via xpack.apm.ui.maxTraceItems to see the full trace, or {discoverLink}."
            values={{
              traceDocsTotal,
              maxTraceItems,
              discoverLink: (
                <EuiLink data-test-subj={`${dataTestSubj}DiscoverLink`} href={discoverHref}>
                  <FormattedMessage
                    id="xpack.apm.waterfall.exceedsMax.discoverLinkText"
                    defaultMessage="view the full trace in Discover"
                  />
                </EuiLink>
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.apm.waterfall.exceedsMax"
            defaultMessage="The number of items in this trace is {traceDocsTotal} which is higher than the current limit of {maxTraceItems}. Please increase the limit via xpack.apm.ui.maxTraceItems to see the full trace."
            values={{ traceDocsTotal, maxTraceItems }}
          />
        )
      }
    />
  );
}
