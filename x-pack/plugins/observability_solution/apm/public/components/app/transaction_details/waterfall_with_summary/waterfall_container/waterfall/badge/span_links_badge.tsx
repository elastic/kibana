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

type Props = SpanLinksCount & {
  id: string;
  onClick: (flyoutDetailTab: string) => unknown;
};

export function SpanLinksBadge({ linkedParents, linkedChildren, id, onClick }: Props) {
  if (!linkedParents && !linkedChildren) {
    return null;
  }
  const spanLinksFlyoutTab = 'span_links';
  const total = linkedParents + linkedChildren;
  return (
    <EuiToolTip
      title={i18n.translate('xpack.apm.waterfall.spanLinks.tooltip.title', {
        defaultMessage: '{total} {total, plural, one {Span link} other {Span links}} found',
        values: { total },
      })}
      content={
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            {i18n.translate('xpack.apm.waterfall.spanLinks.tooltip.linkedChildren', {
              defaultMessage: '{linkedChildren} incoming',
              values: { linkedChildren },
            })}
          </EuiFlexItem>
          <EuiFlexItem>
            {i18n.translate('xpack.apm.waterfall.spanLinks.tooltip.linkedParents', {
              defaultMessage: '{linkedParents} outgoing',
              values: { linkedParents },
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiBadge
        data-test-subj={`spanLinksBadge_${id}`}
        onClick={(e: any) => {
          e.stopPropagation();
          onClick(spanLinksFlyoutTab);
        }}
        onClickAriaLabel={i18n.translate('xpack.apm.waterfall.spanLinks.badgeAriaLabel', {
          defaultMessage: 'Open span links details',
        })}
      >
        {i18n.translate('xpack.apm.waterfall.spanLinks.badge', {
          defaultMessage: '{total} {total, plural, one {Span link} other {Span links}}',
          values: { total },
        })}
      </EuiBadge>
    </EuiToolTip>
  );
}
