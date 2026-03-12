/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface WaterfallSizeWarningBaseProps {
  traceDocsTotal: number;
  maxTraceItems: number;
}

type WaterfallSizeWarningWithLink = WaterfallSizeWarningBaseProps & {
  discoverHref: string;
  'data-test-subj': string;
};

type WaterfallSizeWarningWithoutLink = WaterfallSizeWarningBaseProps & {
  discoverHref?: undefined;
  'data-test-subj'?: string;
};

export type WaterfallSizeWarningProps =
  | WaterfallSizeWarningWithLink
  | WaterfallSizeWarningWithoutLink;

export function WaterfallSizeWarning({
  traceDocsTotal,
  maxTraceItems,
  discoverHref,
  'data-test-subj': dataTestSubj,
}: WaterfallSizeWarningProps) {
  const sharedValues = {
    traceDocsTotal,
    maxTraceItems,
    configKey: <code>{'xpack.apm.ui.maxTraceItems'}</code>,
  };

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
            defaultMessage="The number of items in this trace is {traceDocsTotal} which is higher than the current limit of {maxTraceItems}. Please increase the limit via {configKey} to see the full trace, or {discoverLink}."
            values={{
              ...sharedValues,
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
            defaultMessage="The number of items in this trace is {traceDocsTotal} which is higher than the current limit of {maxTraceItems}. Please increase the limit via {configKey} to see the full trace."
            values={sharedValues}
          />
        )
      }
    />
  );
}
