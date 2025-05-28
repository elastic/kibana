/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SpanLinks } from '.';
import type { SpanLinksCount } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import { TechnicalPreviewBadge } from '../technical_preview_badge';

interface Props {
  spanLinksCount: SpanLinksCount;
  traceId: string | undefined;
  spanId: string | undefined;
  processorEvent: ProcessorEvent;
}

export function getSpanLinksTabContent({ spanLinksCount, traceId, spanId, processorEvent }: Props) {
  if ((!spanLinksCount.linkedChildren && !spanLinksCount.linkedParents) || !traceId || !spanId) {
    return undefined;
  }

  return {
    id: 'span_links',
    'data-test-subj': 'spanLinksTab',
    prepend: <TechnicalPreviewBadge icon="beaker" />,
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
