/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

export function SloRemoteBadge({ slo }: { slo: SLOWithSummaryResponse }) {
  return slo.remoteName ? (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={slo.remoteName}>
        <EuiBadge color="default">
          {i18n.translate('xpack.observability.sloCardItemBadges.remoteBadgeLabel', {
            defaultMessage: 'Remote',
          })}
        </EuiBadge>
      </EuiToolTip>
    </EuiFlexItem>
  ) : null;
}
