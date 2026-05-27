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
  incomingCount: number;
  outgoingCount: number;
  id: string;
  onClick?: (flyoutDetailTab: string) => unknown;
}

const SPAN_LINKS_FLYOUT_TAB = 'span_links';

export function SpanLinksBadge({ outgoingCount, incomingCount, id, onClick }: Props) {
  if (!outgoingCount && !incomingCount) {
    return null;
  }
  const total = outgoingCount + incomingCount;
  return (
    <EuiToolTip
      title={i18n.translate('xpack.apm.waterfall.spanLinks.tooltip.title', {
        defaultMessage: '{total} {total, plural, one {Span link} other {Span links}} found',
        values: { total },
      })}
      content={
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            {i18n.translate('xpack.apm.waterfall.spanLinks.tooltip.incomingCount', {
              defaultMessage: '{incomingCount} incoming',
              values: { incomingCount },
            })}
          </EuiFlexItem>
          <EuiFlexItem>
            {i18n.translate('xpack.apm.waterfall.spanLinks.tooltip.outgoingCount', {
              defaultMessage: '{outgoingCount} outgoing',
              values: { outgoingCount },
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiBadge
        tabIndex={0}
        data-test-subj={`spanLinksBadge_${id}`}
        {...(onClick
          ? {
              onClick: (e: any) => {
                e.stopPropagation();
                onClick(SPAN_LINKS_FLYOUT_TAB);
              },
              onClickAriaLabel: i18n.translate('xpack.apm.waterfall.spanLinks.badgeAriaLabel', {
                defaultMessage: 'Open span links details',
              }),
            }
          : { onClick: undefined, onClickAriaLabel: undefined })} // this is needed to un-confuse TypeScript
      >
        {i18n.translate('xpack.apm.waterfall.spanLinks.badge', {
          defaultMessage: '{total} {total, plural, one {Span link} other {Span links}}',
          values: { total },
        })}
      </EuiBadge>
    </EuiToolTip>
  );
}
