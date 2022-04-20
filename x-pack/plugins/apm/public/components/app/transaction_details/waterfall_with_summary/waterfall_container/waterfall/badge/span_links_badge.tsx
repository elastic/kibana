/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  incomingSpanLinksSize?: number;
  outgoingSpanLinksSize?: number;
}

export function SpanLinksBadge({
  incomingSpanLinksSize = 0,
  outgoingSpanLinksSize = 0,
}: Props) {
  const totalSize = incomingSpanLinksSize + outgoingSpanLinksSize;

  if (!totalSize) {
    return null;
  }

  return (
    <EuiToolTip
      title={i18n.translate('xpack.apm.waterfall.spanLinks.tooltip.title', {
        defaultMessage:
          '{totalSize} {totalSize, plural, one {Span link} other {Span links}} found',
        values: { totalSize },
      })}
      content={
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            {i18n.translate('xpack.apm.waterfall.spanLinks.tooltip.incoming', {
              defaultMessage: '{incomingSpanLinksSize} incoming',
              values: { incomingSpanLinksSize },
            })}
          </EuiFlexItem>
          <EuiFlexItem>
            {i18n.translate('xpack.apm.waterfall.spanLinks.tooltip.outgoing', {
              defaultMessage: '{outgoingSpanLinksSize} outgoing',
              values: { outgoingSpanLinksSize },
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiBadge>
        {i18n.translate('xpack.apm.waterfall.spanLinks.badge', {
          defaultMessage:
            '{totalSize} {totalSize, plural, one {Span link} other {Span links}}',
          values: { totalSize },
        })}
      </EuiBadge>
    </EuiToolTip>
  );
}
