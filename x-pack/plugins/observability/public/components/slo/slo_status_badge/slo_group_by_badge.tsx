/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { euiLightVars } from '@kbn/ui-theme';
import React from 'react';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloGroupByBadge({ slo }: Props) {
  if (!slo.groupBy || slo.groupBy === ALL_VALUE) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiBadge color={euiLightVars.euiColorDisabled}>
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.observability.slo.groupByBadge', {
            defaultMessage: 'Group by {groupBy}',
            values: {
              groupBy: slo.groupBy,
            },
          })}
          display="block"
        >
          <span>
            {slo.groupBy}: {slo.instanceId}
          </span>
        </EuiToolTip>
      </EuiBadge>
    </EuiFlexItem>
  );
}
