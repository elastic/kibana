/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonIcon,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridSorting,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { keyBy } from 'lodash';
import React, { useMemo, useState } from 'react';
import { TopNFunctions, TopNFunctionSortField } from '../../../common/functions';
import { StackFrameMetadata } from '../../../common/profiling';
import { calculateImpactEstimates } from '../../utils/calculate_impact_estimates';
import { asCost } from '../../utils/formatters/as_cost';
import { asWeight } from '../../utils/formatters/as_weight';
import { CPULabelWithHint } from '../cpu_label_with_hint';
import { FrameInformationTooltip } from '../frame_information_window/frame_information_tooltip';
import { StackFrameSummary } from '../stack_frame_summary';
import { GetLabel } from './get_label';

interface Props {
  sortDirection: 'asc' | 'desc';
  sortField: TopNFunctionSortField;
  onSortChange: (options: {
    sortDirection: 'asc' | 'desc';
    sortField: TopNFunctionSortField;
  }) => void;
  topNFunctions?: TopNFunctions;
  comparisonTopNFunctions?: TopNFunctions;
  totalSeconds: number;
  isDifferentialView: boolean;
  baselineScaleFactor?: number;
  comparisonScaleFactor?: number;
}

interface Row {
  rank: number;
  frame: StackFrameMetadata;
  samples: number;
  exclusiveCPU: number;
  inclusiveCPU: number;
  impactEstimates?: ReturnType<typeof calculateImpactEstimates>;
  diff?: {
    rank: number;
    samples: number;
    exclusiveCPU: number;
    inclusiveCPU: number;
  };
}

function scaleValue({ value, scaleFactor = 1 }: { value: number; scaleFactor?: number }) {
  return value * scaleFactor;
}
function SampleStat({
  samples,
  diffSamples,
  totalSamples,
  isSampled,
}: {
  samples: number;
  diffSamples?: number;
  totalSamples: number;
  isSampled: boolean;
}) {
  const samplesLabel = `${isSampled ? '~ ' : ''}${samples.toLocaleString()}`;

  if (diffSamples === undefined || diffSamples === 0 || totalSamples === 0) {
    return <>{samplesLabel}</>;
  }

  const percentDelta = (diffSamples / (samples - diffSamples)) * 100;
  const totalPercentDelta = (diffSamples / totalSamples) * 100;

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>{samplesLabel}</EuiFlexItem>
      <EuiFlexItem>
        <GetLabel value={percentDelta} append=" rel" />
      </EuiFlexItem>
      <EuiFlexItem>
        <GetLabel value={totalPercentDelta} append=" abs" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function CPUStat({ cpu, diffCPU }: { cpu: number; diffCPU?: number; isSampled?: boolean }) {
  const cpuLabel = `${cpu.toFixed(2)}%`;

  if (diffCPU === undefined || diffCPU === 0) {
    return <>{cpuLabel}</>;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>{cpuLabel}</EuiFlexItem>
      <EuiFlexItem>
        <GetLabel value={diffCPU} prepend="(" append=")" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function Grid({
  sortDirection,
  sortField,
  onSortChange,
  topNFunctions,
  comparisonTopNFunctions,
  totalSeconds,
  isDifferentialView,
  baselineScaleFactor,
  comparisonScaleFactor,
}: Props) {
  const theme = useEuiTheme();
  const [selectedRow, setSelectedRow] = useState<Row | undefined>();
  const isEstimatedA = (topNFunctions?.SamplingRate ?? 1.0) !== 1.0;
  const totalCount: number = useMemo(() => {
    if (!topNFunctions || !topNFunctions.TotalCount) {
      return 0;
    }

    return topNFunctions.TotalCount;
  }, [topNFunctions]);

  const rows: Row[] = useMemo(() => {
    if (!topNFunctions || !topNFunctions.TotalCount || topNFunctions.TotalCount === 0) {
      return [];
    }

    const comparisonDataById = comparisonTopNFunctions
      ? keyBy(comparisonTopNFunctions.TopN, 'Id')
      : {};

    return topNFunctions.TopN.filter((topN) => topN.CountExclusive > 0).map((topN, i) => {
      const comparisonRow = comparisonDataById?.[topN.Id];

      const topNCountExclusiveScaled = scaleValue({
        value: topN.CountExclusive,
        scaleFactor: baselineScaleFactor,
      });

      const inclusiveCPU = (topN.CountInclusive / topNFunctions.TotalCount) * 100;
      const exclusiveCPU = (topN.CountExclusive / topNFunctions.TotalCount) * 100;
      const totalSamples = topN.CountExclusive;

      const impactEstimates =
        totalSeconds > 0
          ? calculateImpactEstimates({
              countExclusive: exclusiveCPU,
              countInclusive: inclusiveCPU,
              totalSamples,
              totalSeconds,
            })
          : undefined;

      function calculateDiff() {
        if (comparisonTopNFunctions && comparisonRow) {
          const comparisonCountExclusiveScaled = scaleValue({
            value: comparisonRow.CountExclusive,
            scaleFactor: comparisonScaleFactor,
          });

          return {
            rank: topN.Rank - comparisonRow.Rank,
            samples: topNCountExclusiveScaled - comparisonCountExclusiveScaled,
            exclusiveCPU:
              exclusiveCPU -
              (comparisonRow.CountExclusive / comparisonTopNFunctions.TotalCount) * 100,
            inclusiveCPU:
              inclusiveCPU -
              (comparisonRow.CountInclusive / comparisonTopNFunctions.TotalCount) * 100,
          };
        }
      }

      return {
        rank: topN.Rank,
        frame: topN.Frame,
        samples: topNCountExclusiveScaled,
        exclusiveCPU,
        inclusiveCPU,
        impactEstimates,
        diff: calculateDiff(),
      };
    });
  }, [
    topNFunctions,
    comparisonTopNFunctions,
    totalSeconds,
    comparisonScaleFactor,
    baselineScaleFactor,
  ]);

  const columns: EuiDataGridColumn[] = [
    {
      id: 'rank',
      initialWidth: 70,
      displayAsText: i18n.translate('xpack.profiling.functionsView.rankColumnLabel', {
        defaultMessage: 'Rank',
      }),
    },
    {
      id: 'function',
      displayAsText: i18n.translate('xpack.profiling.functionsView.functionColumnLabel', {
        defaultMessage: 'Function',
      }),
    },
    {
      id: 'samples',
      initialWidth: 200,
      displayAsText: i18n.translate('xpack.profiling.functionsView.samplesColumnLabel', {
        defaultMessage: 'Samples (estd.)',
      }),
    },
    {
      id: 'selfCPU',
      initialWidth: 200,
      display: (
        <CPULabelWithHint type="self" labelSize="s" labelStyle={{ fontWeight: 700 }} iconSize="s" />
      ),
    },
    {
      id: 'totalCPU',
      initialWidth: 200,
      display: (
        <CPULabelWithHint
          type="total"
          labelSize="s"
          labelStyle={{ fontWeight: 700 }}
          iconSize="s"
        />
      ),
    },
  ];
  const leadingControlColumns: EuiDataGridControlColumn[] = [];
  if (!isDifferentialView) {
    columns.push(
      {
        id: 'annualizedCo2',
        initialWidth: 200,
        displayAsText: i18n.translate('xpack.profiling.functionsView.annualizedCo2', {
          defaultMessage: 'Annualized CO2',
        }),
      },
      {
        id: 'annualizedDollarCost',
        initialWidth: 200,
        displayAsText: i18n.translate('xpack.profiling.functionsView.annualizedDollarCost', {
          defaultMessage: `Annualized dollar cost`,
        }),
      }
    );

    leadingControlColumns.push({
      id: 'actions',
      width: 40,
      headerCellRender() {
        return (
          <EuiScreenReaderOnly>
            <span>Controls</span>
          </EuiScreenReaderOnly>
        );
      },
      rowCellRender: function RowCellRender({ rowIndex }) {
        function handleOnClick() {
          setSelectedRow(rows[rowIndex]);
        }
        return (
          <EuiToolTip
            content={i18n.translate('xpack.profiling.functionsView.showMoreButton', {
              defaultMessage: `Show more information`,
            })}
          >
            <EuiButtonIcon
              aria-label="Show actions"
              iconType="expand"
              color="text"
              onClick={handleOnClick}
            />
          </EuiToolTip>
        );
      },
    });
  }

  if (comparisonTopNFunctions) {
    columns.push({
      id: 'diff',
      displayAsText: i18n.translate('xpack.profiling.functionsView.diffColumnLabel', {
        defaultMessage: 'Diff',
      }),
    });
  }
  const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);
  function onSort(newSortingColumns: EuiDataGridSorting['columns']) {
    setSortingColumns(newSortingColumns);
  }

  function RenderCellValue({ rowIndex, columnId }: EuiDataGridCellValueElementProps) {
    const data = rows[rowIndex];
    if (data) {
      if (columnId === 'rank') {
        return <div>{data.rank}</div>;
      }

      if (columnId === 'function') {
        return <StackFrameSummary frame={data.frame} />;
      }

      if (columnId === 'samples') {
        return (
          <SampleStat
            samples={data.samples}
            diffSamples={data.diff?.samples}
            totalSamples={totalCount}
            isSampled={isEstimatedA}
          />
        );
      }

      if (columnId === 'selfCPU') {
        return <CPUStat cpu={data.exclusiveCPU} diffCPU={data.diff?.exclusiveCPU} />;
      }

      if (columnId === 'totalCPU') {
        return <CPUStat cpu={data.inclusiveCPU} diffCPU={data.diff?.inclusiveCPU} />;
      }

      if (columnId === 'annualizedCo2' && data.impactEstimates?.annualizedCo2) {
        return <div>{asWeight(data.impactEstimates.annualizedCo2)}</div>;
      }

      if (columnId === 'annualizedDollarCost' && data.impactEstimates?.annualizedDollarCost) {
        return <div>{asCost(data.impactEstimates.annualizedDollarCost)}</div>;
      }

      if (columnId === 'diff') {
        if (!data.diff) {
          return (
            <EuiText size="xs" color={theme.euiTheme.colors.primaryText}>
              {i18n.translate('xpack.profiling.functionsView.newLabel', {
                defaultMessage: 'New',
              })}
            </EuiText>
          );
        }

        if (data.diff.rank === 0) {
          return null;
        }

        return (
          <EuiBadge
            color={data.diff.rank > 0 ? 'success' : 'danger'}
            iconType={data.diff.rank > 0 ? 'sortDown' : 'sortUp'}
            iconSide="right"
            style={{ minWidth: '100%', textAlign: 'right' }}
          >
            {data.diff.rank}
          </EuiBadge>
        );
      }
    }
    return null;
  }

  return (
    <>
      <EuiDataGrid
        aria-label="TopN functions"
        columns={columns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        rowCount={totalCount}
        renderCellValue={RenderCellValue}
        sorting={{ columns: sortingColumns, onSort }}
        leadingControlColumns={leadingControlColumns}
      />
      {selectedRow && (
        <FrameInformationTooltip
          onClose={() => {
            setSelectedRow(undefined);
          }}
          frame={{
            addressOrLine: selectedRow.frame.AddressOrLine,
            countExclusive: selectedRow.exclusiveCPU,
            countInclusive: selectedRow.inclusiveCPU,
            exeFileName: selectedRow.frame.ExeFileName,
            fileID: selectedRow.frame.FileID,
            frameType: selectedRow.frame.FrameType,
            functionName: selectedRow.frame.FunctionName,
            sourceFileName: selectedRow.frame.SourceFilename,
            sourceLine: selectedRow.frame.SourceLine,
          }}
          totalSeconds={totalSeconds ?? 0}
          totalSamples={selectedRow.samples}
          samplingRate={topNFunctions?.SamplingRate ?? 1.0}
        />
      )}
    </>
  );
}
