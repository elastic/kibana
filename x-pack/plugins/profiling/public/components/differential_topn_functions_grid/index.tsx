/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridSorting,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  getCalleeFunction,
  StackFrameMetadata,
  TopNComparisonFunctionSortField,
  TopNFunctions,
  TopNFunctionSortField,
} from '@kbn/profiling-utils';
import { orderBy } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useCalculateImpactEstimate } from '../../hooks/use_calculate_impact_estimates';
import { FunctionRow } from '../topn_functions/function_row';
import { getFunctionsRows, IFunctionRow } from '../topn_functions/utils';
import { getColumns } from './get_columns';
import { getCompareFrameAction } from './get_compare_frame_action';

const removeComparisonFromId = (id: string) => id.replace('comparison_', '');
export const isComparisonColumn = (id: string) => id.startsWith('comparison_');

type SortDirection = 'asc' | 'desc';

function sortRows(data: IFunctionRow[], sortField: string, sortDirection: SortDirection) {
  switch (sortField) {
    case TopNFunctionSortField.Frame:
      return orderBy(data, (row) => getCalleeFunction(row.frame), sortDirection);
    case TopNFunctionSortField.SelfCPU:
      return orderBy(data, (row) => row.selfCPUPerc, sortDirection);
    case TopNFunctionSortField.TotalCPU:
      return orderBy(data, (row) => row.totalCPUPerc, sortDirection);
    default:
      return orderBy(data, sortField, sortDirection);
  }
}

export type OnChangeSortParams =
  | { sortField: TopNFunctionSortField; sortDirection: SortDirection }
  | {
      comparisonSortField: TopNComparisonFunctionSortField;
      comparisonSortDirection: SortDirection;
    };

export function getFrameIdentification(frame: StackFrameMetadata) {
  return [
    frame.SourceFilename,
    frame.FunctionName,
    frame.ExeFileName,
    frame.FileID,
    frame.AddressOrLine,
  ].join('|');
}

export interface SelectedFrame {
  currentFrameId?: string;
  isComparison: boolean;
}

interface Props {
  base?: TopNFunctions;
  baselineScaleFactor?: number;
  comparison?: TopNFunctions;
  comparisonScaleFactor?: number;
  onChangePage: (nextPage: number) => void;
  onChangeSort: (sorting: OnChangeSortParams) => void;
  onFrameClick?: (functionName: string) => void;
  pageIndex: number;
  sortDirection: 'asc' | 'desc';
  sortField: TopNFunctionSortField;
  comparisonSortDirection: 'asc' | 'desc';
  comparisonSortField: TopNComparisonFunctionSortField;
  totalSeconds: number;
}

export function DifferentialTopNFunctionsGrid({
  base,
  baselineScaleFactor,
  comparison,
  comparisonScaleFactor,
  onChangePage,
  onChangeSort,
  pageIndex,
  sortDirection,
  sortField,
  totalSeconds,
  onFrameClick,
  comparisonSortDirection,
  comparisonSortField,
}: Props) {
  const calculateImpactEstimates = useCalculateImpactEstimate();
  const [selectedFrame, setSelectedFrame] = useState<SelectedFrame | undefined>();
  const theme = useEuiTheme();

  const totalCount = useMemo(() => {
    if (!base || !base.TotalCount) {
      return 0;
    }

    return base.TotalCount;
  }, [base]);

  function onSort(newSortingColumns: EuiDataGridSorting['columns']) {
    // As newSortingColumns is an array and we only sort by a single field for both base and comparison
    // I need to look for the item that is not the same as in the URL to identify what's the side being sorted.
    const sortingItem = newSortingColumns.reverse().find((item) => {
      const isComparison = isComparisonColumn(item.id);
      if (isComparison) {
        return !(comparisonSortField === item.id && comparisonSortDirection === item.direction);
      }
      return !(sortField === item.id && sortDirection === item.direction);
    });
    if (sortingItem) {
      const isComparison = isComparisonColumn(sortingItem.id);
      onChangeSort(
        isComparison
          ? {
              comparisonSortDirection: sortingItem.direction,
              comparisonSortField: sortingItem.id as TopNComparisonFunctionSortField,
            }
          : {
              sortDirection: sortingItem.direction,
              sortField: sortingItem.id as TopNFunctionSortField,
            }
      );
    }
  }

  const { baseRows, comparisonRows } = useMemo(() => {
    return {
      baseRows: getFunctionsRows({
        calculateImpactEstimates,
        topNFunctions: base,
        totalSeconds: 900,
      }),
      comparisonRows: getFunctionsRows({
        baselineScaleFactor,
        calculateImpactEstimates,
        comparisonScaleFactor,
        comparisonTopNFunctions: base,
        topNFunctions: comparison,
        totalSeconds,
      }),
    };
  }, [
    base,
    baselineScaleFactor,
    calculateImpactEstimates,
    comparison,
    comparisonScaleFactor,
    totalSeconds,
  ]);

  const columns: EuiDataGridColumn[] = useMemo(() => {
    const compareFrameAction = getCompareFrameAction({
      baseRows,
      comparisonRows,
      onClick: setSelectedFrame,
      selectedFrame,
    });
    return getColumns(compareFrameAction);
  }, [baseRows, comparisonRows, selectedFrame]);

  const sortedBaseRows = useMemo(() => {
    return sortRows(baseRows, sortField, sortDirection);
  }, [baseRows, sortDirection, sortField]);

  const sortedComparisonRows = useMemo(() => {
    return sortRows(
      comparisonRows,
      removeComparisonFromId(comparisonSortField),
      comparisonSortDirection
    );
  }, [comparisonRows, comparisonSortDirection, comparisonSortField]);

  const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

  function CellValue({ rowIndex, columnId, setCellProps }: EuiDataGridCellValueElementProps) {
    const isComparison = isComparisonColumn(columnId);
    const data = isComparison ? sortedComparisonRows[rowIndex] : sortedBaseRows[rowIndex];

    useEffect(() => {
      // Add thick border to divide the baseline and comparison columns
      if (isComparison && columnId === TopNComparisonFunctionSortField.ComparisonRank) {
        setCellProps({
          style: { borderLeft: theme.euiTheme.border.thick },
        });
      } else if (columnId === TopNFunctionSortField.TotalCPU) {
        setCellProps({
          style: { borderRight: theme.euiTheme.border.thin },
        });
      }
    }, [columnId, isComparison, setCellProps]);

    if (data === undefined) {
      return null;
    }

    return (
      <div data-test-subj={columnId}>
        <FunctionRow
          functionRow={data}
          columnId={removeComparisonFromId(columnId)}
          setCellProps={setCellProps}
          totalCount={totalCount}
          onFrameClick={onFrameClick}
        />
      </div>
    );
  }

  const rowCount = Math.min(Math.max(sortedBaseRows.length, sortedComparisonRows.length), 100);

  return (
    <EuiDataGrid
      data-test-subj="profilingDiffTopNFunctionsGrid"
      css={css`
        .thickBorderLeft {
          border-left: ${theme.euiTheme.border.thick} !important;
        }
      `}
      aria-label={i18n.translate('xpack.profiling.onWeelkDiffTopN.euiDataGrid.topNFunctionsLabel', {
        defaultMessage: 'TopN functions',
      })}
      columns={columns}
      columnVisibility={{ visibleColumns, setVisibleColumns }}
      rowCount={rowCount}
      renderCellValue={CellValue}
      sorting={{
        columns: [
          { id: sortField, direction: sortDirection },
          { id: comparisonSortField, direction: comparisonSortDirection },
        ],
        onSort,
      }}
      pagination={{
        pageIndex,
        pageSize: 50,
        // Left it empty on purpose as it is a required property on the pagination
        onChangeItemsPerPage: () => {},
        onChangePage,
        pageSizeOptions: [],
      }}
      rowHeightsOptions={{ defaultHeight: 'auto' }}
      toolbarVisibility={{
        showColumnSelector: false,
        showKeyboardShortcuts: false,
        showDisplaySelector: false,
        showSortSelector: false,
      }}
    />
  );
}
