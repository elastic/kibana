/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const title = i18n.translate('xpack.apm.trace.barDetails.euiIconTip.spanMissingDestinationTitle', {
  defaultMessage: 'Missing destination',
});

const content = i18n.translate(
  'xpack.apm.trace.barDetails.euiIconTip.spanMissingDestinationContent',
  {
    defaultMessage:
      'This exit span is missing the span.destination.service.resource field which might prevent linking it to downstream transactions on features that depend on this information. i.e.: Service map. Make sure the instrumentation of this exit span follows OTel Semantic Conventions',
  }
);

export function SpanMissingDestinationTooltip() {
  return (
    <EuiIconTip
      data-test-subj="apmBarDetailsMissingDestinationTooltip"
      iconProps={{
        'data-test-subj': 'apmBarDetailsMissingDestinationIcon',
        'aria-label': title,
      }}
      type="warning"
      color="danger"
      size="s"
      title={title}
      content={content}
    />
  );
}
