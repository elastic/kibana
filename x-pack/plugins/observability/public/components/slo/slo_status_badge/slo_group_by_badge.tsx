/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { EuiBadge, EuiBadgeProps, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { euiLightVars } from '@kbn/ui-theme';

export interface Props {
  color?: EuiBadgeProps['color'];
  slo: SLOWithSummaryResponse;
}

export function SloGroupByBadge({ slo, color }: Props) {
  if (!slo.groupBy || slo.groupBy === ALL_VALUE) {
    return null;
  }
  const groupings = [slo.groupBy].flat();

  return (
    <EuiFlexItem grow={false}>
      {groupings.map((group) => (
        <EuiBadge color={color ?? euiLightVars.euiColorDisabled}>
          <EuiToolTip
            position="top"
            content={i18n.translate('xpack.observability.slo.groupByBadge', {
              defaultMessage: 'Group by {groupKey}',
              values: {
                groupKey: group,
              },
            })}
            display="block"
          >
            <span>
              {group}: {get(slo.groupings, group)}
            </span>
          </EuiToolTip>
        </EuiBadge>
      ))}
    </EuiFlexItem>
  );
}
