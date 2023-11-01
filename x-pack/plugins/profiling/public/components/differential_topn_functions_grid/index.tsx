/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridColumnCellAction,
  EuiDataGridSorting,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiTitle,
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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useCalculateImpactEstimate } from '../../hooks/use_calculate_impact_estimates';
import { CPULabelWithHint } from '../cpu_label_with_hint';
import { LabelWithHint } from '../label_with_hint';
import { FunctionRow } from '../topn_functions/function_row';
import { getFunctionsRows, IFunctionRow } from '../topn_functions/utils';

const removeComparisonFromId = (id: string) => id.replace('comparison_', '');
const isComparisonColumn = (id: string) => id.startsWith('comparison_');

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

function getFrameIdentification(frame: StackFrameMetadata) {
  return [
    frame.SourceFilename,
    frame.FunctionName,
    frame.ExeFileName,
    frame.FileID,
    frame.AddressOrLine,
  ].join('|');
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
  const [selectedFrameId, setSelectedFrameId] = useState<
    { currentFrameId?: string; isComparison: boolean } | undefined
  >();
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

  const compareFrameAction: EuiDataGridColumnCellAction = useCallback(
    ({ rowIndex, columnId, Component }) => {
      const isComparison = isComparisonColumn(columnId);
      const currentRow = isComparison ? comparisonRows[rowIndex] : baseRows[rowIndex];
      if (currentRow === undefined) {
        return null;
      }
      const currentFrameId = getFrameIdentification(currentRow.frame);

      const isOpen = selectedFrameId
        ? selectedFrameId.currentFrameId === currentFrameId &&
          selectedFrameId.isComparison === isComparison
        : false;

      const compareRow = isComparison
        ? baseRows.find((item) => getFrameIdentification(item.frame) === currentFrameId)
        : comparisonRows.find((item) => getFrameIdentification(item.frame) === currentFrameId);

      return (
        <EuiPopover
          button={
            <Component
              onClick={() => {
                setSelectedFrameId({ currentFrameId, isComparison });
              }}
              iconType="inspect"
            >
              {i18n.translate('xpack.profiling.compareFrame.component.findLabel', {
                defaultMessage: 'Find corresponding frame',
              })}
            </Component>
          }
          isOpen={isOpen}
          closePopover={() => {
            setSelectedFrameId(undefined);
          }}
          anchorPosition="upRight"
          css={css`
            .euiPopover__anchor {
              align-items: start;
              display: flex;
            }
          `}
        >
          {compareRow ? (
            <div style={{ maxWidth: 400 }}>
              <EuiPopoverTitle paddingSize="s">
                {isComparison
                  ? i18n.translate('xpack.profiling.diffTopNFunctions.baseLineFunction', {
                      defaultMessage: 'Baseline function',
                    })
                  : i18n.translate('xpack.profiling.diffTopNFunctions.comparisonLineFunction', {
                      defaultMessage: 'Comparison function',
                    })}
              </EuiPopoverTitle>
              <EuiTitle size="xs">
                <EuiText>{getCalleeFunction(compareRow.frame)}</EuiText>
              </EuiTitle>
              <EuiBasicTable
                items={[compareRow]}
                columns={[
                  { field: 'rank', name: 'Rank' },
                  {
                    field: 'samples',
                    name: 'Samples',
                    render: (_, value) => value.samples.toLocaleString(),
                  },
                  {
                    field: 'selfCPUPerc',
                    name: 'Self CPU',
                    render: (_, value) => `${value.selfCPUPerc.toFixed(2)}%`,
                  },
                  {
                    field: 'totalCPUPerc',
                    name: 'Total CPU',
                    render: (_, value) => `${value.totalCPUPerc.toFixed(2)}%`,
                  },
                ]}
              />
            </div>
          ) : (
            <EuiText color="subdued" size="s">
              {i18n.translate('xpack.profiling.diffTopNFunctions.noCorrespondingValueFound', {
                defaultMessage: 'No corresponding value found',
              })}
            </EuiText>
          )}
        </EuiPopover>
      );
    },
    [baseRows, comparisonRows, selectedFrameId]
  );

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

  const columns: EuiDataGridColumn[] = useMemo(
    () => [
      {
        id: TopNFunctionSortField.Rank,
        actions: { showHide: false },
        displayAsText: 'Rank',
        initialWidth: 65,
        schema: 'numeric',
      },
      {
        id: TopNFunctionSortField.Frame,
        actions: { showHide: false },
        displayAsText: i18n.translate('xpack.profiling.functionsView.functionColumnLabel', {
          defaultMessage: 'Function',
        }),
        cellActions: [compareFrameAction],
      },
      {
        id: TopNFunctionSortField.Samples,
        initialWidth: 120,
        schema: 'numeric',
        actions: { showHide: false },
        display: (
          <LabelWithHint
            label={i18n.translate('xpack.profiling.functionsView.samplesColumnLabel', {
              defaultMessage: 'Samples',
            })}
            hint={i18n.translate('xpack.profiling.functionsView.samplesColumnLabel.hint', {
              defaultMessage: 'Estimated values',
            })}
            labelSize="s"
            labelStyle={{ fontWeight: 700 }}
            iconSize="s"
          />
        ),
      },
      {
        id: TopNFunctionSortField.SelfCPU,
        actions: { showHide: false },
        schema: 'numeric',
        initialWidth: 120,
        display: (
          <CPULabelWithHint
            type="self"
            labelSize="s"
            labelStyle={{ fontWeight: 700 }}
            iconSize="s"
          />
        ),
      },
      {
        id: TopNFunctionSortField.TotalCPU,
        actions: { showHide: false },
        schema: 'numeric',
        initialWidth: 120,
        display: (
          <CPULabelWithHint
            type="total"
            labelSize="s"
            labelStyle={{ fontWeight: 700 }}
            iconSize="s"
          />
        ),
      },
      {
        id: TopNComparisonFunctionSortField.ComparisonRank,
        actions: { showHide: false },
        schema: 'numeric',
        displayAsText: 'Rank',
        initialWidth: 69,
        displayHeaderCellProps: { className: 'thickBorderLeft' },
      },
      {
        id: TopNComparisonFunctionSortField.ComparisonFrame,
        actions: { showHide: false },
        displayAsText: i18n.translate('xpack.profiling.functionsView.functionColumnLabel', {
          defaultMessage: 'Function',
        }),
        cellActions: [compareFrameAction],
      },
      {
        id: TopNComparisonFunctionSortField.ComparisonSamples,
        actions: { showHide: false },
        schema: 'numeric',
        initialWidth: 120,
        display: (
          <LabelWithHint
            label={i18n.translate('xpack.profiling.functionsView.samplesColumnLabel', {
              defaultMessage: 'Samples',
            })}
            hint={i18n.translate('xpack.profiling.functionsView.samplesColumnLabel.hint', {
              defaultMessage: 'Estimated values',
            })}
            labelSize="s"
            labelStyle={{ fontWeight: 700 }}
            iconSize="s"
          />
        ),
      },
      {
        id: TopNComparisonFunctionSortField.ComparisonSelfCPU,
        actions: { showHide: false },
        schema: 'numeric',
        initialWidth: 120,
        display: (
          <CPULabelWithHint
            type="self"
            labelSize="s"
            labelStyle={{ fontWeight: 700 }}
            iconSize="s"
          />
        ),
      },
      {
        id: TopNComparisonFunctionSortField.ComparisonTotalCPU,
        actions: { showHide: false },
        schema: 'numeric',
        initialWidth: 120,
        display: (
          <CPULabelWithHint
            type="total"
            labelSize="s"
            labelStyle={{ fontWeight: 700 }}
            iconSize="s"
          />
        ),
      },
      {
        displayAsText: 'Diff',
        actions: { showHide: false },
        id: TopNComparisonFunctionSortField.ComparisonDiff,
        initialWidth: 70,
        isSortable: false,
      },
    ],
    [compareFrameAction]
  );

  const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

  function RenderCellValue({ rowIndex, columnId, setCellProps }: EuiDataGridCellValueElementProps) {
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

  const rowCount = Math.max(sortedBaseRows.length, sortedComparisonRows.length);

  return (
    <div>
      <EuiDataGrid
        data-test-subj="DiffTopNFunctions"
        css={css`
          .thickBorderLeft {
            border-left: ${theme.euiTheme.border.thick} !important;
          }
        `}
        aria-label={i18n.translate(
          'xpack.profiling.onWeelkDiffTopN.euiDataGrid.topNFunctionsLabel',
          { defaultMessage: 'TopN functions' }
        )}
        columns={columns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        rowCount={rowCount > 100 ? 100 : rowCount}
        renderCellValue={RenderCellValue}
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
    </div>
  );
}
