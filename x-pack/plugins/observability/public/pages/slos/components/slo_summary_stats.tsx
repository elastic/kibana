/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { asPercentWithTwoDecimals } from '../../../../common/utils/formatters';
import { SLO } from '../../../typings';
import { isSloHealthy } from '../helpers/is_slo_healthy';
import { getSloDifference } from '../helpers/get_slo_difference';

export interface SloSummaryStatsProps {
  slo: SLO;
}

export function SloSummaryStats({ slo }: SloSummaryStatsProps) {
  const isHealthy = isSloHealthy(slo);
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
              title={asPercentWithTwoDecimals(slo.summary.sliValue, 1, 'n/a')}
              titleColor={isHealthy ? '' : 'danger'}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ width: 110 }}>
            <EuiStat
              description={i18n.translate('xpack.observability.slos.slo.stats.slo', {
                defaultMessage: 'SLO',
              })}
              title={asPercentWithTwoDecimals(slo.objective.target, 1, 'n/a')}
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
              titleColor={isHealthy ? '' : 'danger'}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ width: 120 }}>
            <EuiStat
              description={i18n.translate('xpack.observability.slos.slo.stats.budgetRemaining', {
                defaultMessage: 'Budget remaining',
              })}
              title={asPercentWithTwoDecimals(slo.summary.errorBudget.remaining, 1, 'n/a')}
              titleColor={isHealthy ? '' : 'danger'}
              titleSize="m"
              reverse
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
