/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { asCost } from '../../utils/formatters/as_cost';
import { asWeight } from '../../utils/formatters/as_weight';
import { StackFrameSummary } from '../stack_frame_summary';
import { CPUStat } from './cpu_stat';
import { SampleStat } from './sample_stat';
import { IFunctionRow } from './utils';

interface Props {
  functionRow: IFunctionRow;
  columnId: string;
  totalCount: number;
  isEstimatedA: boolean;
}

export function FunctionRow({ functionRow, columnId, totalCount, isEstimatedA }: Props) {
  const theme = useEuiTheme();
  if (columnId === 'rank') {
    return <div>{functionRow.rank}</div>;
  }

  if (columnId === 'function') {
    return <StackFrameSummary frame={functionRow.frame} />;
  }

  if (columnId === 'samples') {
    return (
      <SampleStat
        samples={functionRow.samples}
        diffSamples={functionRow.diff?.samples}
        totalSamples={totalCount}
        isSampled={isEstimatedA}
      />
    );
  }

  if (columnId === 'selfCPU') {
    return <CPUStat cpu={functionRow.exclusiveCPU} diffCPU={functionRow.diff?.exclusiveCPU} />;
  }

  if (columnId === 'totalCPU') {
    return <CPUStat cpu={functionRow.inclusiveCPU} diffCPU={functionRow.diff?.inclusiveCPU} />;
  }

  if (columnId === 'annualizedCo2' && functionRow.impactEstimates?.annualizedCo2) {
    return <div>{asWeight(functionRow.impactEstimates.annualizedCo2)}</div>;
  }

  if (columnId === 'annualizedDollarCost' && functionRow.impactEstimates?.annualizedDollarCost) {
    return <div>{asCost(functionRow.impactEstimates.annualizedDollarCost)}</div>;
  }

  if (columnId === 'diff') {
    if (!functionRow.diff) {
      return (
        <EuiText size="xs" color={theme.euiTheme.colors.primaryText}>
          {i18n.translate('xpack.profiling.functionsView.newLabel', {
            defaultMessage: 'New',
          })}
        </EuiText>
      );
    }

    if (functionRow.diff.rank === 0) {
      return null;
    }

    return (
      <EuiBadge
        color={functionRow.diff.rank > 0 ? 'success' : 'danger'}
        iconType={functionRow.diff.rank > 0 ? 'sortDown' : 'sortUp'}
        iconSide="right"
        style={{ minWidth: '100%', textAlign: 'right' }}
      >
        {functionRow.diff.rank}
      </EuiBadge>
    );
  }
  return null;
}
