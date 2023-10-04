/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiStat,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { keyBy, orderBy } from 'lodash';
import React, { useMemo, useState } from 'react';
import { TopNFunctions, TopNFunctionSortField } from '../../../common/functions';
import { getCalleeFunction, StackFrameMetadata } from '../../../common/profiling';
import { calculateImpactEstimates } from '../../utils/calculate_impact_estimates';
import { asCost } from '../../utils/formatters/as_cost';
import { asWeight } from '../../utils/formatters/as_weight';
import { FrameInformationTooltip } from '../frame_information_window/frame_information_tooltip';
import { CPULabelWithHint } from '../cpu_label_with_hint';
import { StackFrameSummary } from '../stack_frame_summary';
import { GetLabel } from './get_label';

interface Row {
  rank: number;
  frame: StackFrameMetadata;
  samples: number;
  exclusiveCPUPerc: number;
  inclusiveCPUPerc: number;
  exclusiveCPU: number;
  inclusiveCPU: number;
  impactEstimates?: ReturnType<typeof calculateImpactEstimates>;
  diff?: {
    rank: number;
    samples: number;
    exclusiveCPUPerc: number;
    inclusiveCPUPerc: number;
    exclusiveCPU: number;
    inclusiveCPU: number;
  };
}

function TotalSamplesStat({
  baselineTotalSamples,
  baselineScaleFactor,
  comparisonTotalSamples,
  comparisonScaleFactor,
}: {
  baselineTotalSamples: number;
  baselineScaleFactor?: number;
  comparisonTotalSamples?: number;
  comparisonScaleFactor?: number;
}) {
  const scaledBaselineTotalSamples = scaleValue({
    value: baselineTotalSamples,
    scaleFactor: baselineScaleFactor,
  });

  const value = scaledBaselineTotalSamples.toLocaleString();

  const sampleHeader = i18n.translate('xpack.profiling.functionsView.totalSampleCountLabel', {
    defaultMessage: ' Total sample estimate: ',
  });

  if (comparisonTotalSamples === undefined || comparisonTotalSamples === 0) {
    return (
      <EuiStat
        title={<EuiText style={{ fontWeight: 'bold' }}>{value}</EuiText>}
        description={sampleHeader}
      />
    );
  }

  const scaledComparisonTotalSamples = scaleValue({
    value: comparisonTotalSamples,
    scaleFactor: comparisonScaleFactor,
  });

  const diffSamples = scaledBaselineTotalSamples - scaledComparisonTotalSamples;
  const percentDelta = (diffSamples / (scaledBaselineTotalSamples - diffSamples)) * 100;

  return (
    <EuiStat
      title={
        <EuiText style={{ fontWeight: 'bold' }}>
          {value}
          <GetLabel value={percentDelta} prepend="(" append=")" />
        </EuiText>
      }
      description={sampleHeader}
    />
  );
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

function scaleValue({ value, scaleFactor = 1 }: { value: number; scaleFactor?: number }) {
  return value * scaleFactor;
}

export function TopNFunctionsTable({
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

      const inclusiveCPUPerc = (topN.CountInclusive / topNFunctions.TotalCount) * 100;
      const exclusiveCPUPerc = (topN.CountExclusive / topNFunctions.TotalCount) * 100;
      const totalSamples = topN.CountExclusive;

      const impactEstimates =
        totalSeconds > 0
          ? calculateImpactEstimates({
              countExclusive: topN.CountExclusive,
              countInclusive: topN.CountInclusive,
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
            exclusiveCPU: comparisonRow.CountExclusive,
            inclusiveCPU: comparisonRow.CountInclusive,
            exclusiveCPUPerc:
              exclusiveCPUPerc -
              (comparisonRow.CountExclusive / comparisonTopNFunctions.TotalCount) * 100,
            inclusiveCPUPerc:
              inclusiveCPUPerc -
              (comparisonRow.CountInclusive / comparisonTopNFunctions.TotalCount) * 100,
          };
        }
      }

      return {
        rank: topN.Rank,
        frame: topN.Frame,
        samples: topNCountExclusiveScaled,
        exclusiveCPUPerc,
        inclusiveCPUPerc,
        exclusiveCPU: topN.CountExclusive,
        inclusiveCPU: topN.CountInclusive,
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

  const theme = useEuiTheme();

  const columns: Array<EuiBasicTableColumn<Row>> = [
    {
      field: TopNFunctionSortField.Rank,
      name: i18n.translate('xpack.profiling.functionsView.rankColumnLabel', {
        defaultMessage: 'Rank',
      }),
      render: (_, { rank }) => {
        return <EuiText style={{ whiteSpace: 'nowrap', fontSize: 'inherit' }}>{rank}</EuiText>;
      },
      align: 'right',
    },
    {
      field: TopNFunctionSortField.Frame,
      name: i18n.translate('xpack.profiling.functionsView.functionColumnLabel', {
        defaultMessage: 'Function',
      }),
      render: (_, { frame }) => <StackFrameSummary frame={frame} />,
      width: '50%',
    },
    {
      field: TopNFunctionSortField.Samples,
      name: i18n.translate('xpack.profiling.functionsView.samplesColumnLabel', {
        defaultMessage: 'Samples (estd.)',
      }),
      render: (_, { samples, diff }) => {
        return (
          <SampleStat
            samples={samples}
            diffSamples={diff?.samples}
            totalSamples={totalCount}
            isSampled={isEstimatedA}
          />
        );
      },
      align: 'right',
    },
    {
      field: TopNFunctionSortField.ExclusiveCPU,
      name: (
        <CPULabelWithHint
          type="self"
          labelSize="xs"
          labelStyle={{ fontWeight: 600 }}
          iconSize="s"
        />
      ),
      render: (_, { exclusiveCPUPerc, diff }) => {
        return <CPUStat cpu={exclusiveCPUPerc} diffCPU={diff?.exclusiveCPUPerc} />;
      },
      align: 'right',
    },
    {
      field: TopNFunctionSortField.InclusiveCPU,
      name: (
        <CPULabelWithHint
          type="total"
          labelSize="xs"
          labelStyle={{ fontWeight: 600 }}
          iconSize="s"
        />
      ),
      render: (_, { inclusiveCPUPerc, diff }) => {
        return <CPUStat cpu={inclusiveCPUPerc} diffCPU={diff?.inclusiveCPUPerc} />;
      },
      align: 'right',
    },
  ];

  if (comparisonTopNFunctions) {
    columns.push({
      field: TopNFunctionSortField.Diff,
      name: i18n.translate('xpack.profiling.functionsView.diffColumnLabel', {
        defaultMessage: 'Diff',
      }),
      align: 'right',
      render: (_, { diff }) => {
        if (!diff) {
          return (
            <EuiText size="xs" color={theme.euiTheme.colors.primaryText}>
              {i18n.translate('xpack.profiling.functionsView.newLabel', { defaultMessage: 'New' })}
            </EuiText>
          );
        }

        if (diff.rank === 0) {
          return null;
        }

        const color = diff.rank > 0 ? 'success' : 'danger';
        const icon = diff.rank > 0 ? 'sortDown' : 'sortUp';

        return (
          <EuiBadge
            color={color}
            iconType={icon}
            iconSide="right"
            style={{ minWidth: '100%', textAlign: 'right' }}
          >
            {diff.rank}
          </EuiBadge>
        );
      },
    });
  }
  if (!isDifferentialView) {
    columns.push(
      {
        field: 'annualized_co2',
        name: i18n.translate('xpack.profiling.functionsView.annualizedCo2', {
          defaultMessage: 'Annualized CO2',
        }),
        render: (_, { impactEstimates }) => {
          if (impactEstimates?.annualizedCo2) {
            return <div>{asWeight(impactEstimates.annualizedCo2)}</div>;
          }
        },
        align: 'right',
      },
      {
        field: 'annualized_dollar_cost',
        name: i18n.translate('xpack.profiling.functionsView.annualizedDollarCost', {
          defaultMessage: `Annualized dollar cost`,
        }),
        render: (_, { impactEstimates }) => {
          if (impactEstimates?.annualizedDollarCost) {
            return <div>{asCost(impactEstimates.annualizedDollarCost)}</div>;
          }
        },
        align: 'right',
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'show_more_information',
            description: i18n.translate('xpack.profiling.functionsView.showMoreButton', {
              defaultMessage: `Show more information`,
            }),
            icon: 'inspect',
            color: 'primary',
            type: 'icon',
            onClick: setSelectedRow,
          },
        ],
      }
    );
  }

  const sortedRows = orderBy(
    rows,
    (row) => {
      return sortField === TopNFunctionSortField.Frame
        ? getCalleeFunction(row.frame).toLowerCase()
        : row[sortField];
    },
    [sortDirection]
  ).slice(0, 100);
  return (
    <>
      <TotalSamplesStat
        baselineTotalSamples={totalCount}
        baselineScaleFactor={baselineScaleFactor}
        comparisonTotalSamples={comparisonTopNFunctions?.TotalCount}
        comparisonScaleFactor={comparisonScaleFactor}
      />
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiBasicTable
        items={sortedRows}
        columns={columns}
        tableLayout="auto"
        onChange={(criteria) => {
          onSortChange({
            sortDirection: criteria.sort!.direction,
            sortField: criteria.sort!.field as TopNFunctionSortField,
          });
        }}
        sorting={{
          enableAllColumns: true,
          sort: {
            direction: sortDirection,
            field: sortField,
          },
        }}
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
          totalSamples={totalCount}
          samplingRate={topNFunctions?.SamplingRate ?? 1.0}
        />
      )}
    </>
  );
}
