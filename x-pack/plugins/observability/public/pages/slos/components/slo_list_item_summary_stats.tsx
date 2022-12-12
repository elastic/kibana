/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { asPercent } from '../../../../common/utils/formatters';
import { SLO } from '../../../typings';
import { isSloHealthy } from '../helpers/is_slo_healthy';

export interface SloListItemSummaryStatsProps {
  slo: SLO;
}

export function SloListItemSummaryStats({ slo }: SloListItemSummaryStatsProps) {
  const isHealthy = isSloHealthy(slo);

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={false}>
        <EuiStat
          reverse
          title={asPercent(slo.summary.sliValue, 1, 'n/a')}
          titleColor={isHealthy ? '' : 'danger'}
          titleSize="m"
          description="SLI value"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          reverse
          title={asPercent(slo.objective.target, 1, 'n/a')}
          titleColor={isHealthy ? '' : 'danger'}
          titleSize="m"
          description="Objective"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          reverse
          title={asPercent(slo.summary.errorBudget.remaining, 1, 'n/a')}
          titleColor={isHealthy ? '' : 'danger'}
          titleSize="m"
          description="Budget remaining"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
