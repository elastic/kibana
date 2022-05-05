/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SpanLinks } from '.';
import { SpanLinksCount } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import { ProcessorEvent } from '../../../../common/processor_event';

interface Props {
  spanLinksCount: SpanLinksCount;
  traceId: string;
  spanId: string;
  processorEvent: ProcessorEvent;
}

export function getSpanLinksTabContent({
  spanLinksCount,
  traceId,
  spanId,
  processorEvent,
}: Props) {
  if (!spanLinksCount.linkedChildren && !spanLinksCount.linkedParents) {
    return;
  }

  return {
    id: 'span_links',
    'data-test-subj': 'spanLinksTab',
    name: (
      <>
        {i18n.translate('xpack.apm.propertiesTable.tabs.spanLinks', {
          defaultMessage: 'Span links',
        })}
      </>
    ),
    append: (
      <EuiNotificationBadge color="subdued">
        {spanLinksCount.linkedChildren + spanLinksCount.linkedParents}
      </EuiNotificationBadge>
    ),
    content: (
      <>
        <EuiSpacer size="m" />
        <SpanLinks
          spanLinksCount={spanLinksCount}
          traceId={traceId}
          spanId={spanId}
          processorEvent={processorEvent}
        />
      </>
    ),
  };
}
