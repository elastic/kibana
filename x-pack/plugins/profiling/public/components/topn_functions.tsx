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
    exclusiveCPU: number;
    inclusiveCPU: number;
  };
}

function CPUStat({ cpu, diffCPU }: { cpu: number; diffCPU: number | undefined }) {
  const cpuLabel = `${cpu.toFixed(2)}%`;

  if (diffCPU === undefined || diffCPU === 0) {
    return <>{cpuLabel}</>;
  }
  const color = diffCPU < 0 ? 'success' : 'danger';
  const label = Math.abs(diffCPU) <= 0.01 ? '<0.01' : Math.abs(diffCPU).toFixed(2);

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
        defaultMessage: 'Samples',
      }),
      align: 'right',
      render: (_, { samples }) => {
        return <EuiText style={{ whiteSpace: 'nowrap', fontSize: 'inherit' }}>{samples}</EuiText>;
      },
    },
    {
      field: TopNFunctionSortField.ExclusiveCPU,
      name: i18n.translate('xpack.profiling.functionsView.exclusiveCpuColumnLabel', {
        defaultMessage: 'Exclusive CPU',
      }),
      render: (_, { exclusiveCPU, diff }) => {
        return <CPUStat cpu={exclusiveCPU} diffCPU={diff?.exclusiveCPU} />;
      },
      align: 'right',
    },
    {
      field: TopNFunctionSortField.InclusiveCPU,
      name: i18n.translate('xpack.profiling.functionsView.inclusiveCpuColumnLabel', {
        defaultMessage: 'Inclusive CPU',
      }),
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

  const totalSampleCountLabel = i18n.translate(
    'xpack.profiling.functionsView.totalSampleCountLabel',
    {
      defaultMessage: 'Total sample count',
    }
  );

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
      <EuiText size="xs">
        <strong>{totalSampleCountLabel}:</strong> {totalCount}
      </EuiText>
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
