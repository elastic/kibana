/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SpanLinksCount } from '../waterfall_helpers/waterfall_helpers';

export function SpanLinksBadge({ outgoing, incoming }: SpanLinksCount) {
  if (!outgoing && !incoming) {
    return null;
  }

  const total = outgoing + incoming;
  return (
    <EuiToolTip
      title={i18n.translate('xpack.apm.waterfall.spanLinks.tooltip.title', {
        defaultMessage:
          '{total} {total, plural, one {Span link} other {Span links}} found',
        values: { total },
      })}
      content={
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            {i18n.translate('xpack.apm.waterfall.spanLinks.tooltip.incoming', {
              defaultMessage: '{incoming} incoming',
              values: { incoming },
            })}
          </EuiFlexItem>
          <EuiFlexItem>
            {i18n.translate('xpack.apm.waterfall.spanLinks.tooltip.outgoing', {
              defaultMessage: '{outgoing} outgoing',
              values: { outgoing },
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiBadge data-test-subj="spanLinksBadge">
        {i18n.translate('xpack.apm.waterfall.spanLinks.badge', {
          defaultMessage:
            '{total} {total, plural, one {Span link} other {Span links}}',
          values: { total },
        })}
      </EuiBadge>
    </EuiToolTip>
  );
}
