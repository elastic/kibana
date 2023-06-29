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
  EuiDataGridSorting,
  EuiScreenReaderOnly,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { TopNFunctions } from '../../../common/functions';
import { CPULabelWithHint } from '../cpu_label_with_hint';
import { FrameInformationTooltip } from '../frame_information_window/frame_information_tooltip';
import { FunctionRow } from './function_row';
import { TotalSamplesStat } from './total_samples_stat';
import { getFunctionsRows, IFunctionRow } from './utils';

interface Props {
  topNFunctions?: TopNFunctions;
  comparisonTopNFunctions?: TopNFunctions;
  totalSeconds: number;
  isDifferentialView: boolean;
  baselineScaleFactor?: number;
  comparisonScaleFactor?: number;
  onFrameClick?: (functionName: string) => void;
}

export function Grid({
  topNFunctions,
  comparisonTopNFunctions,
  totalSeconds,
  isDifferentialView,
  baselineScaleFactor,
  comparisonScaleFactor,
  onFrameClick,
}: Props) {
  const [selectedRow, setSelectedRow] = useState<IFunctionRow | undefined>();
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([
    { id: 'rank', direction: 'asc' },
  ]);
  function onSort(newSortingColumns: EuiDataGridSorting['columns']) {
    setSortingColumns(newSortingColumns);
  }

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 100 });
  function onChangeItemsPerPage(pageSize: number) {
    setPagination((state) => ({ ...state, pageSize, pageIndex: 0 }));
  }
  function onChangePage(pageIndex: number) {
    setPagination((state) => ({ ...state, pageIndex }));
  }

  const isEstimatedA = (topNFunctions?.SamplingRate ?? 1.0) !== 1.0;
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
      initialWidth: 90,
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
  if (isDifferentialView) {
    columns.push({
      id: 'diff',
      displayAsText: i18n.translate('xpack.profiling.functionsView.diffColumnLabel', {
        defaultMessage: 'Diff',
      }),
    });
  } else {
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
          <EuiButtonIcon
            aria-label="Show actions"
            iconType="expand"
            color="text"
            onClick={handleOnClick}
          />
        );
      },
    });
  }

  const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

  function RenderCellValue({ rowIndex, columnId }: EuiDataGridCellValueElementProps) {
    const data = rows[rowIndex];
    if (data) {
      return (
        <FunctionRow
          functionRow={data}
          columnId={columnId}
          isEstimatedA={isEstimatedA}
          totalCount={totalCount}
          onFrameClick={onFrameClick}
        />
      );
    }
    return null;
  }

  return (
    <>
      <TotalSamplesStat
        baselineTotalSamples={totalCount}
        baselineScaleFactor={baselineScaleFactor}
        comparisonTotalSamples={comparisonTopNFunctions?.TotalCount}
        comparisonScaleFactor={comparisonScaleFactor}
      />
      <EuiSpacer size="s" />
      <EuiDataGrid
        aria-label="TopN functions"
        columns={columns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        rowCount={1000}
        renderCellValue={RenderCellValue}
        inMemory={{ level: 'sorting' }}
        sorting={{ columns: sortingColumns, onSort }}
        leadingControlColumns={leadingControlColumns}
        pagination={{
          ...pagination,
          onChangeItemsPerPage,
          onChangePage,
        }}
        rowHeightsOptions={{ defaultHeight: 'auto' }}
        toolbarVisibility={{
          showColumnSelector: false,
          showKeyboardShortcuts: !isDifferentialView,
          showDisplaySelector: !isDifferentialView,
          showFullScreenSelector: !isDifferentialView,
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
          totalSamples={selectedRow.samples}
          samplingRate={topNFunctions?.SamplingRate ?? 1.0}
        />
      )}
    </>
  );
}
