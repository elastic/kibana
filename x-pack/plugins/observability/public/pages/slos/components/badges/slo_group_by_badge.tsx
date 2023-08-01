/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { euiLightVars } from '@kbn/ui-theme';
import React from 'react';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloGroupByBadge({ slo }: Props) {
  if (!slo.groupBy || slo.groupBy === '*') {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
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
        <EuiBadge color={euiLightVars.euiColorDisabled}>
          {slo.groupBy}: {slo.instanceId}
        </EuiBadge>
      </EuiToolTip>
    </EuiFlexItem>
  );
}
