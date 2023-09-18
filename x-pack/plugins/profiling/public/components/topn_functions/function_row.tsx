/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDataGridCellValueElementProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiBackgroundColor,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { TopNFunctionSortField } from '../../../common/functions';
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
  onFrameClick?: (functionName: string) => void;
  setCellProps: EuiDataGridCellValueElementProps['setCellProps'];
}

export function FunctionRow({
  functionRow,
  columnId,
  totalCount,
  onFrameClick,
  setCellProps,
}: Props) {
  const theme = useEuiTheme();
  const successColor = useEuiBackgroundColor('success');
  const dangerColor = useEuiBackgroundColor('danger');

  if (columnId === TopNFunctionSortField.Diff) {
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

    const color = functionRow.diff.rank > 0 ? 'success' : 'danger';
    setCellProps({ style: { backgroundColor: color === 'success' ? successColor : dangerColor } });

    return (
      <EuiFlexGroup direction="row" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiIcon type={functionRow.diff.rank > 0 ? 'sortUp' : 'sortDown'} color={color} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{Math.abs(functionRow.diff.rank)}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (columnId === TopNFunctionSortField.Rank) {
    return <div>{functionRow.rank}</div>;
  }

  if (columnId === TopNFunctionSortField.Frame) {
    return <StackFrameSummary frame={functionRow.frame} onFrameClick={onFrameClick} />;
  }

  if (columnId === TopNFunctionSortField.Samples) {
    setCellProps({ css: { textAlign: 'right' } });
    return (
      <SampleStat
        samples={functionRow.samples}
        diffSamples={functionRow.diff?.samples}
        totalSamples={totalCount}
      />
    );
  }

  if (columnId === TopNFunctionSortField.SelfCPU) {
    return <CPUStat cpu={functionRow.selfCPUPerc} diffCPU={functionRow.diff?.selfCPUPerc} />;
  }

  if (columnId === TopNFunctionSortField.TotalCPU) {
    return <CPUStat cpu={functionRow.totalCPUPerc} diffCPU={functionRow.diff?.totalCPUPerc} />;
  }

  if (
    columnId === TopNFunctionSortField.AnnualizedCo2 &&
    functionRow.impactEstimates?.selfCPU?.annualizedCo2
  ) {
    return <div>{asWeight(functionRow.impactEstimates.selfCPU.annualizedCo2)}</div>;
  }

  if (
    columnId === TopNFunctionSortField.AnnualizedDollarCost &&
    functionRow.impactEstimates?.selfCPU?.annualizedDollarCost
  ) {
    return <div>{asCost(functionRow.impactEstimates.selfCPU.annualizedDollarCost)}</div>;
  }

  return null;
}
