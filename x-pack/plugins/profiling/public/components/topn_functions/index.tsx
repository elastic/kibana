/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridRefProps,
  EuiDataGridSorting,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import { getCalleeFunction, TopNFunctions, TopNFunctionSortField } from '@kbn/profiling-utils';
import { last, orderBy } from 'lodash';
import React, { forwardRef, Ref, useMemo, useState } from 'react';
import { GridOnScrollProps } from 'react-window';
import { CPULabelWithHint } from '../cpu_label_with_hint';
import { FrameInformationTooltip } from '../frame_information_window/frame_information_tooltip';
import { LabelWithHint } from '../label_with_hint';
import { FunctionRow } from './function_row';
import { getFunctionsRows, IFunctionRow } from './utils';
import { useCalculateImpactEstimate } from '../../hooks/use_calculate_impact_estimates';

interface Props {
  topNFunctions?: TopNFunctions;
  comparisonTopNFunctions?: TopNFunctions;
  totalSeconds: number;
  isDifferentialView: boolean;
  baselineScaleFactor?: number;
  comparisonScaleFactor?: number;
  onFrameClick?: (functionName: string) => void;
  onScroll?: (scroll: GridOnScrollProps) => void;
  showDiffColumn?: boolean;
  pageIndex: number;
  onChangePage: (nextPage: number) => void;
  sortField: TopNFunctionSortField;
  sortDirection: 'asc' | 'desc';
  onChangeSort: (sorting: EuiDataGridSorting['columns'][0]) => void;
  dataTestSubj?: string;
  isEmbedded?: boolean;
}

export const TopNFunctionsGrid = forwardRef(
  (
    {
      topNFunctions,
      comparisonTopNFunctions,
      totalSeconds,
      isDifferentialView,
      baselineScaleFactor,
      comparisonScaleFactor,
      onFrameClick,
      onScroll,
      showDiffColumn = false,
      pageIndex,
      onChangePage,
      sortField,
      sortDirection,
      onChangeSort,
      dataTestSubj = 'topNFunctionsGrid',
      isEmbedded = false,
    }: Props,
    ref: Ref<EuiDataGridRefProps> | undefined
  ) => {
    const [selectedRow, setSelectedRow] = useState<IFunctionRow | undefined>();
    const trackProfilingEvent = useUiTracker({ app: 'profiling' });
    const calculateImpactEstimates = useCalculateImpactEstimate();

    function onSort(newSortingColumns: EuiDataGridSorting['columns']) {
      const lastItem = last(newSortingColumns);
      if (lastItem) {
        onChangeSort(lastItem);
      }
    }

    const totalCount = useMemo(() => {
      if (!topNFunctions || !topNFunctions.TotalCount) {
        return 0;
      }

      return topNFunctions.TotalCount;
    }, [topNFunctions]);

    const rows = useMemo(() => {
      return getFunctionsRows({
        baselineScaleFactor,
        comparisonScaleFactor,
        comparisonTopNFunctions,
        topNFunctions,
        totalSeconds,
        calculateImpactEstimates,
      });
    }, [
      baselineScaleFactor,
      calculateImpactEstimates,
      comparisonScaleFactor,
      comparisonTopNFunctions,
      topNFunctions,
      totalSeconds,
    ]);

    const sortedRows = useMemo(() => {
      switch (sortField) {
        case TopNFunctionSortField.Frame:
          return orderBy(rows, (row) => getCalleeFunction(row.frame), sortDirection);
        case TopNFunctionSortField.SelfCPU:
          return orderBy(rows, (row) => row.selfCPUPerc, sortDirection);
        case TopNFunctionSortField.TotalCPU:
          return orderBy(rows, (row) => row.totalCPUPerc, sortDirection);
        case TopNFunctionSortField.AnnualizedCo2:
          return orderBy(rows, (row) => row.impactEstimates?.selfCPU.annualizedCo2, sortDirection);
        case TopNFunctionSortField.AnnualizedDollarCost:
          return orderBy(
            rows,
            (row) => row.impactEstimates?.selfCPU.annualizedDollarCost,
            sortDirection
          );
        default:
          return orderBy(rows, sortField, sortDirection);
      }
    }, [rows, sortDirection, sortField]);

    const { columns, leadingControlColumns } = useMemo(() => {
      const gridColumns: EuiDataGridColumn[] = [
        {
          id: TopNFunctionSortField.Rank,
          schema: 'numeric',
          actions: { showHide: false },
          initialWidth: isDifferentialView ? 50 : 90,
          displayAsText: i18n.translate('xpack.profiling.functionsView.rankColumnLabel', {
            defaultMessage: 'Rank',
          }),
        },
        {
          id: TopNFunctionSortField.Frame,
          actions: { showHide: false },
          displayAsText: i18n.translate('xpack.profiling.functionsView.functionColumnLabel', {
            defaultMessage: 'Function',
          }),
        },
        {
          id: TopNFunctionSortField.Samples,
          initialWidth: isDifferentialView ? 100 : 200,
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
          schema: 'numeric',
          actions: { showHide: false },
          initialWidth: isDifferentialView ? 100 : 200,
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
          schema: 'numeric',
          actions: { showHide: false },
          initialWidth: isDifferentialView ? 100 : 200,
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

      const gridLeadingControlColumns: EuiDataGridControlColumn[] = [];
      if (showDiffColumn) {
        gridColumns.push({
          initialWidth: 60,
          id: TopNFunctionSortField.Diff,
          actions: { showHide: false },
          displayAsText: i18n.translate('xpack.profiling.functionsView.diffColumnLabel', {
            defaultMessage: 'Diff',
          }),
        });
      }

      if (!isDifferentialView) {
        gridColumns.push(
          {
            id: TopNFunctionSortField.AnnualizedCo2,
            actions: { showHide: false },
            initialWidth: isDifferentialView ? 100 : 200,
            schema: 'numeric',
            display: (
              <LabelWithHint
                label={i18n.translate('xpack.profiling.functionsView.annualizedCo2', {
                  defaultMessage: 'Annualized CO2',
                })}
                hint={i18n.translate('xpack.profiling.functionsView.annualizedCo2.hint', {
                  defaultMessage:
                    'Indicates the CO2 emission of the function and any functions called by it.',
                })}
                labelSize="s"
                labelStyle={{ fontWeight: 700 }}
                iconSize="s"
              />
            ),
          },
          {
            id: TopNFunctionSortField.AnnualizedDollarCost,
            schema: 'numeric',
            actions: { showHide: false },
            initialWidth: isDifferentialView ? 100 : 200,
            display: (
              <LabelWithHint
                label={i18n.translate('xpack.profiling.functionsView.annualizedDollarCost', {
                  defaultMessage: `Annualized dollar cost`,
                })}
                hint={i18n.translate('xpack.profiling.functionsView.annualizedDollarCost.hint', {
                  defaultMessage: `Indicates the Dollar cost of the function and any functions called by it.`,
                })}
                labelSize="s"
                labelStyle={{ fontWeight: 700 }}
                iconSize="s"
              />
            ),
          }
        );

        gridLeadingControlColumns.push({
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
              trackProfilingEvent({ metric: 'topN_function_details_click' });
              setSelectedRow(sortedRows[rowIndex]);
            }
            return (
              <EuiButtonIcon
                data-test-subj="profilingTopNFunctionsGridButton"
                aria-label="Show actions"
                iconType="expand"
                color="text"
                onClick={handleOnClick}
              />
            );
          },
        });
      }
      return { columns: gridColumns, leadingControlColumns: gridLeadingControlColumns };
    }, [isDifferentialView, sortedRows, showDiffColumn, trackProfilingEvent]);

    const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

    function RenderCellValue({
      rowIndex,
      columnId,
      setCellProps,
    }: EuiDataGridCellValueElementProps) {
      const data = sortedRows[rowIndex];
      if (data) {
        return (
          <FunctionRow
            functionRow={data}
            columnId={columnId}
            totalCount={totalCount}
            onFrameClick={onFrameClick}
            setCellProps={setCellProps}
          />
        );
      }
      return null;
    }

    return (
      <>
        <EuiDataGrid
          data-test-subj={dataTestSubj}
          ref={ref}
          aria-label="TopN functions"
          columns={columns}
          columnVisibility={{ visibleColumns, setVisibleColumns }}
          rowCount={sortedRows.length > 100 ? 100 : sortedRows.length}
          renderCellValue={RenderCellValue}
          sorting={{ columns: [{ id: sortField, direction: sortDirection }], onSort }}
          leadingControlColumns={leadingControlColumns}
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
            showKeyboardShortcuts: !isDifferentialView,
            showDisplaySelector: !isDifferentialView,
            showFullScreenSelector: !isDifferentialView,
            showSortSelector: false,
          }}
          virtualizationOptions={{
            onScroll,
          }}
        />
        {selectedRow && (
          <FrameInformationTooltip
            onClose={() => {
              setSelectedRow(undefined);
            }}
            frame={{
              addressOrLine: selectedRow.frame.AddressOrLine,
              countExclusive: selectedRow.selfCPU,
              countInclusive: selectedRow.totalCPU,
              exeFileName: selectedRow.frame.ExeFileName,
              fileID: selectedRow.frame.FileID,
              frameType: selectedRow.frame.FrameType,
              functionName: selectedRow.frame.FunctionName,
              sourceFileName: selectedRow.frame.SourceFilename,
              sourceLine: selectedRow.frame.SourceLine,
            }}
            totalSeconds={totalSeconds}
            totalSamples={totalCount}
            showAIAssistant={!isEmbedded}
            showSymbolsStatus={!isEmbedded}
          />
        )}
      </>
    );
  }
);
