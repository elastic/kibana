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
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { keyBy, orderBy } from 'lodash';
import React, { useMemo } from 'react';
import { TopNFunctions, TopNFunctionSortField } from '../../common/functions';
import { getCalleeFunction, StackFrameMetadata } from '../../common/profiling';
import { StackFrameSummary } from './stack_frame_summary';

interface Row {
  rank: number;
  frame: StackFrameMetadata;
  samples: number;
  exclusiveCPU: number;
  inclusiveCPU: number;
  diff?: {
    rank: number;
    samples: number;
    exclusiveCPU: number;
    inclusiveCPU: number;
  };
}

/**
 * Format number of samples as human-readable text.
 *
 * @param bytes Number of bytes.
 * @param dp Number of decimal places to display.
 *
 * @return Formatted string.
 */
function humanSampleCount(samples, dp=2) {
  const thresh = 1000;

  if (Math.abs(samples) < thresh) {
    return samples + ' ';
  }

  const units = ['k', 'M', 'B', 'T', 'Q'];
  let u = -1;
  const r = 10**dp;

  do {
    samples /= thresh;
    ++u;
  } while (Math.round(Math.abs(samples) * r) / r >= thresh && u < units.length - 1);

  return samples.toFixed(dp) + ' ' + units[u];
}

function TotalSamplesStat({ totalSamples, newSamples } : { totalSamples : number, newSamples : number | undefined }) {
  const samplesLabel = `${totalSamples.toLocaleString()}`;
  const sampleHeader = i18n.translate('xpack.profiling.functionsView.totalSampleCountLabel',
    { defaultMessage: ' Total sample estimate: ',});

  if (newSamples === undefined || newSamples === 0) {
    return (
      <EuiText size="xs">
        <strong>{sampleHeader}
        </strong>
        { " " + totalSamples.toLocaleString()}
      </EuiText>)
  }

  const diffSamples = totalSamples - newSamples;
  const color = diffSamples < 0 ? 'success' : 'danger';
  const prefix = diffSamples < 0 ? '-' : '+';
  const percentDelta = (diffSamples / (totalSamples - diffSamples))*100;
  const label = Math.abs(percentDelta) <= 0.01 ? '<0.01' : 
    " " + prefix + Math.abs(percentDelta).toFixed(2) + "%";

  return (
    <EuiText size="xs">
      <strong>{sampleHeader}</strong>{ " " + totalSamples.toLocaleString() + " " } 
      <EuiTextColor color={color} size="xs">({label})</EuiTextColor>
    </EuiText>
  );
}

function SampleStat({ samples, diffSamples, totalSamples } :
  { samples: number; diffSamples: number | undefined; totalSamples: number | undefined }){
  const samplesLabel = `${samples.toLocaleString()}`;

  if (diffSamples === undefined || diffSamples === 0) {
    return <>{samplesLabel}</>;
  }
  const color = diffSamples < 0 ? 'success' : 'danger';
  const prefix = diffSamples < 0 ? '-' : '+';
  const percentDelta = (diffSamples / (samples - diffSamples))*100;
  const label = Math.abs(percentDelta) <= 0.01 ? '<0.01' : 
    prefix + Math.abs(percentDelta).toFixed(2) + "% rel";

  const totalPercentDelta = (diffSamples / totalSamples)*100;
  const totalLabel = Math.abs(totalPercentDelta) <= 0.01 ? '<0.01' : 
    prefix + Math.abs(totalPercentDelta).toFixed(2) + "% abs";

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>{samplesLabel}</EuiFlexItem>
      <EuiFlexItem>
        <EuiText color={color} size="s">
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color={color} size="s">
          {totalLabel}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function CPUStat({ cpu, diffCPU }: { cpu: number; diffCPU: number | undefined }) {
  const cpuLabel = `${cpu.toFixed(2)}%`;

  if (diffCPU === undefined || diffCPU === 0) {
    return <>{cpuLabel}</>;
  }
  const color = diffCPU < 0 ? 'success' : 'danger';
  const prefix = diffCPU < 0 ? '-' : '+';
  const label = Math.abs(diffCPU) <= 0.01 ? '<0.01' : prefix + Math.abs(diffCPU).toFixed(2);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>{cpuLabel}</EuiFlexItem>
      <EuiFlexItem>
        <EuiText color={color} size="s">
          ({label})
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const TopNFunctionsTable = ({
  sortDirection,
  sortField,
  onSortChange,
  topNFunctions,
  comparisonTopNFunctions,
}: {
  sortDirection: 'asc' | 'desc';
  sortField: TopNFunctionSortField;
  onSortChange: (options: {
    sortDirection: 'asc' | 'desc';
    sortField: TopNFunctionSortField;
  }) => void;
  topNFunctions?: TopNFunctions;
  comparisonTopNFunctions?: TopNFunctions;
}) => {
  const totalCount: number = useMemo(() => {
    if (!topNFunctions || !topNFunctions.TotalCount || topNFunctions.TotalCount === 0) {
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

      const inclusiveCPU = (topN.CountInclusive / topNFunctions.TotalCount) * 100;
      const exclusiveCPU = (topN.CountExclusive / topNFunctions.TotalCount) * 100;

      const diff =
        comparisonTopNFunctions && comparisonRow
          ? {
              rank: topN.Rank - comparisonRow.Rank,
              samples: topN.CountExclusive - comparisonRow.CountExclusive,
              exclusiveCPU:
                exclusiveCPU -
                (comparisonRow.CountExclusive / comparisonTopNFunctions.TotalCount) * 100,
              inclusiveCPU:
                inclusiveCPU -
                (comparisonRow.CountInclusive / comparisonTopNFunctions.TotalCount) * 100,
            }
          : undefined;

      return {
        rank: topN.Rank,
        frame: topN.Frame,
        samples: topN.CountExclusive,
        exclusiveCPU,
        inclusiveCPU,
        diff,
      };
    });
  }, [topNFunctions, comparisonTopNFunctions]);

  const theme = useEuiTheme();

  const columns: Array<EuiBasicTableColumn<Row>> = [
    {
      field: TopNFunctionSortField.Rank,
      name: i18n.translate('xpack.profiling.functionsView.rankColumnLabel', {
        defaultMessage: 'Rank',
      }),
      align: 'right',
    },
    {
      field: TopNFunctionSortField.Frame,
      name: i18n.translate('xpack.profiling.functionsView.functionColumnLabel', {
        defaultMessage: 'Function',
      }),
      width: '100%',
      render: (_, { frame }) => <StackFrameSummary frame={frame} />,
    },
    {
      field: TopNFunctionSortField.Samples,
      name: i18n.translate('xpack.profiling.functionsView.samplesColumnLabel', {
        defaultMessage: 'Samples (estd.)',
      }),
      align: 'right',
      render: (_, { samples, diff }) => {
        return <SampleStat samples={samples} diffSamples={diff?.samples} totalSamples={totalCount} />;
      },
    },
    {
      field: TopNFunctionSortField.ExclusiveCPU,
      name: (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            {i18n.translate('xpack.profiling.functionsView.cpuColumnLabel1Exclusive', {
                          defaultMessage: 'CPU excl.'})}
          </EuiFlexItem>
          <EuiFlexItem>
            {i18n.translate('xpack.profiling.functionsView.cpuColumnLabel2Exclusive', {
                          defaultMessage: 'subfunctions'})}
         </EuiFlexItem>
        </EuiFlexGroup>
      ),
      render: (_, { exclusiveCPU, diff }) => {
        return <CPUStat cpu={exclusiveCPU} diffCPU={diff?.exclusiveCPU} />;
      },
      align: 'right',
    },
    {
      field: TopNFunctionSortField.InclusiveCPU,
      name: (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            {i18n.translate('xpack.profiling.functionsView.cpuColumnLabel1Inclusive', {
                          defaultMessage: 'CPU incl.'})}
          </EuiFlexItem>
          <EuiFlexItem>
            {i18n.translate('xpack.profiling.functionsView.cpuColumnLabel2Inclusive', {
                          defaultMessage: 'subfunctions'})}
         </EuiFlexItem>
        </EuiFlexGroup>
      ),
      render: (_, { inclusiveCPU, diff }) => {
        return <CPUStat cpu={inclusiveCPU} diffCPU={diff?.inclusiveCPU} />;
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

  const sortedRows = orderBy(
    rows,
    (row) => {
      return sortField === TopNFunctionSortField.Frame
        ? getCalleeFunction(row.frame).toLowerCase()
        : row[sortField];
    },
    [sortDirection]
  );

  return (
    <>
      <TotalSamplesStat totalSamples={totalCount} newSamples={comparisonTopNFunctions?.TotalCount} />
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
    </>
  );
};
