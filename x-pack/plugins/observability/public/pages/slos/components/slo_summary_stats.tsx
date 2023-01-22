/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { asPercentWithTwoDecimals } from '../../../../common/utils/formatters';
import { getSloDifference } from '../helpers/get_slo_difference';

export interface SloSummaryStatsProps {
  slo: SLOWithSummaryResponse;
}

export function SloSummaryStats({ slo }: SloSummaryStatsProps) {
  const titleColor = slo.summary.status === 'VIOLATED' ? 'danger' : '';
  const { label } = getSloDifference(slo);

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem>
        <EuiFlexGroup direction="row" responsive={false}>
          <EuiFlexItem grow={false} style={{ width: 120 }}>
            <EuiStat
              description={i18n.translate('xpack.observability.slos.slo.stats.observedValue', {
                defaultMessage: 'Observed value',
              })}
              title={
                slo.summary.status === 'NO_DATA'
                  ? NOT_AVAILABLE_LABEL
                  : asPercentWithTwoDecimals(slo.summary.sliValue, 1)
              }
              titleColor={titleColor}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ width: 110 }}>
            <EuiStat
              description={i18n.translate('xpack.observability.slos.slo.stats.objective', {
                defaultMessage: 'Objective',
              })}
              title={asPercentWithTwoDecimals(slo.objective.target, 1)}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="row" responsive={false}>
          <EuiFlexItem grow={false} style={{ width: 120 }}>
            <EuiStat
              description={i18n.translate('xpack.observability.slos.slo.stats.difference', {
                defaultMessage: 'Difference',
              })}
              title={label}
              titleColor={titleColor}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ width: 120 }}>
            <EuiStat
              description={i18n.translate('xpack.observability.slos.slo.stats.budgetRemaining', {
                defaultMessage: 'Budget remaining',
              })}
              title={asPercentWithTwoDecimals(slo.summary.errorBudget.remaining, 1)}
              titleColor={titleColor}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
