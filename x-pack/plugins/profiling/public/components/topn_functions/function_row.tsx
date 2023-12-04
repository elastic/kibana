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
import { TopNFunctionSortField } from '@kbn/profiling-utils';
import React, { useEffect } from 'react';
import { profilingUseLegacyCo2Calculation } from '@kbn/observability-plugin/common';
import { asCost } from '../../utils/formatters/as_cost';
import { asWeight } from '../../utils/formatters/as_weight';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
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
  const {
    start: { core },
  } = useProfilingDependencies();

  const shouldUseLegacyCo2Calculation = core.uiSettings.get<boolean>(
    profilingUseLegacyCo2Calculation
  );

  if (columnId === TopNFunctionSortField.Diff) {
    return <DiffColumn diff={functionRow.diff} setCellProps={setCellProps} />;
  }

  if (columnId === TopNFunctionSortField.Rank) {
    return <div>{functionRow.rank}</div>;
  }

  if (columnId === TopNFunctionSortField.Frame) {
    return <StackFrameSummary frame={functionRow.frame} onFrameClick={onFrameClick} />;
  }

  if (columnId === TopNFunctionSortField.Samples) {
    return (
      <SamplesColumn
        samples={functionRow.samples}
        diffSamples={functionRow.diff?.samples}
        totalSamples={totalCount}
        setCellProps={setCellProps}
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
    functionRow.impactEstimates?.totalCPU?.annualizedCo2
  ) {
    return (
      <div>
        {asWeight(
          shouldUseLegacyCo2Calculation
            ? functionRow.impactEstimates.totalCPU.annualizedCo2
            : functionRow.totalAnnualCO2kgs,
          'kgs'
        )}
      </div>
    );
  }

  if (
    columnId === TopNFunctionSortField.AnnualizedDollarCost &&
    functionRow.impactEstimates?.totalCPU?.annualizedDollarCost
  ) {
    return (
      <div>
        {asCost(
          shouldUseLegacyCo2Calculation
            ? functionRow.impactEstimates.totalCPU.annualizedDollarCost
            : functionRow.totalAnnualCostUSD
        )}
      </div>
    );
  }

  return null;
}

interface SamplesColumnProps {
  samples: number;
  diffSamples?: number;
  totalSamples: number;
  setCellProps: EuiDataGridCellValueElementProps['setCellProps'];
}

function SamplesColumn({ samples, totalSamples, diffSamples, setCellProps }: SamplesColumnProps) {
  useEffect(() => {
    setCellProps({ css: { textAlign: 'right' } });
  }, [setCellProps]);
  return <SampleStat samples={samples} diffSamples={diffSamples} totalSamples={totalSamples} />;
}

interface DiffColumnProps {
  diff: IFunctionRow['diff'];
  setCellProps: EuiDataGridCellValueElementProps['setCellProps'];
}

function DiffColumn({ diff, setCellProps }: DiffColumnProps) {
  const theme = useEuiTheme();
  const successColor = useEuiBackgroundColor('success');
  const dangerColor = useEuiBackgroundColor('danger');

  useEffect(() => {
    if (diff && diff.rank !== 0) {
      const color = diff.rank > 0 ? 'success' : 'danger';
      setCellProps({
        style: { backgroundColor: color === 'success' ? successColor : dangerColor },
      });
    }
  }, [dangerColor, diff, setCellProps, successColor]);

  if (!diff) {
    return (
      <EuiText size="xs" color={theme.euiTheme.colors.primaryText}>
        {i18n.translate('xpack.profiling.functionsView.newLabel', {
          defaultMessage: 'New',
        })}
      </EuiText>
    );
  }

  if (diff.rank === 0) {
    return null;
  }

  return (
    <EuiFlexGroup direction="row" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={diff.rank > 0 ? 'sortUp' : 'sortDown'}
          color={diff.rank > 0 ? 'success' : 'danger'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{Math.abs(diff.rank)}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
