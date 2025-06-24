/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export function SpanMissingDestinationTooltip() {
  return (
    <EuiToolTip
      title={i18n.translate('xpack.apm.waterfallItem.euiToolTip.spanMissingDestinationLabel', {
        defaultMessage: 'Missing destination',
      })}
      content={i18n.translate(
        'xpack.apm.waterfallItem.euiToolTip.spanMissingDestinationDescription',
        {
          defaultMessage:
            'This exit span is missing the span.destination.service.resource field which might prevent linking it to downstream transactions on features that depend on this information. i.e.: Service Map. Make sure the instrumentation of this exit span follows OTel Semantic Conventions',
        }
      )}
    >
      <EuiIcon type="warning" size="s" color="danger" />
    </EuiToolTip>
  );
}
