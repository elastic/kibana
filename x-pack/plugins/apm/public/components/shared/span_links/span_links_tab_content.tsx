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
import { SpanLinks as SpanLinksType } from '../../../../typings/es_schemas/raw/fields/span_links';

export function getSpanLinksTabContent({
  incomingSpanLinks,
  outgoingSpanLinks,
}: {
  incomingSpanLinks?: SpanLinksType;
  outgoingSpanLinks?: SpanLinksType;
}) {
  if (!incomingSpanLinks?.length && !outgoingSpanLinks?.length) {
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
        {(incomingSpanLinks?.length || 0) + (outgoingSpanLinks?.length || 0)}
      </EuiNotificationBadge>
    ),
    content: (
      <>
        <EuiSpacer size="m" />
        <SpanLinks
          spanLinks={{
            incoming: incomingSpanLinks,
            outgoing: outgoingSpanLinks,
          }}
        />
      </>
    ),
  };
}
