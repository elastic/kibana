/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBetaBadge, EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SpanLinks } from '.';
import { ProcessorEvent } from '../../../../common/processor_event';
import { SpanLinksCount } from '../../app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

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
    return undefined;
  }

  return {
    id: 'span_links',
    'data-test-subj': 'spanLinksTab',
    prepend: (
      <EuiBetaBadge
        label={i18n.translate(
          'xpack.apm.propertiesTable.spanLinks.beta.label',
          { defaultMessage: 'Technical preview' }
        )}
        tooltipContent={i18n.translate(
          'xpack.apm.propertiesTable.spanLinks.beta.content',
          {
            defaultMessage:
              'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
          }
        )}
        iconType="beaker"
      />
    ),
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
