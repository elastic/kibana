/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC, useState, useMemo } from 'react';
import {
  EuiDataGrid,
  EuiDataGridColumnCellActionProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDataGridColumn } from '@elastic/eui/src/components/datagrid/data_grid_types';
import { CellActions } from './cell_actions';
import { BrowserFields, SecuritySolutionDataViewBase } from '../../../../types';
import { Indicator, RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { cellRendererFactory } from './cell_renderer';
import { EmptyState } from '../../../../components/empty_state';
import { IndicatorsTableContext, IndicatorsTableContextValue } from './context';
import { IndicatorsFlyout } from '../flyout';
import { useToolbarOptions } from './hooks/use_toolbar_options';
import { ColumnSettingsValue } from './hooks/use_column_settings';
import { useFieldTypes } from '../../../../hooks/use_field_types';
import { getFieldSchema } from '../../utils/get_field_schema';
import { Pagination } from '../../services/fetch_indicators';

export interface IndicatorsTableProps {
  indicators: Indicator[];
  indicatorCount: number;
  pagination: Pagination;
  onChangeItemsPerPage: (value: number) => void;
  onChangePage: (value: number) => void;
  /**
   * If true, no data is available yet
   */
  isLoading: boolean;
  indexPattern: SecuritySolutionDataViewBase;
  browserFields: BrowserFields;
  columnSettings: ColumnSettingsValue;
}

export const TABLE_TEST_ID = 'tiIndicatorsTable';

const gridStyle = {
  border: 'horizontal',
  header: 'underline',
  cellPadding: 'm',
  fontSize: 's',
} as const;

export const IndicatorsTable: VFC<IndicatorsTableProps> = ({
  indicators,
  indicatorCount,
  onChangePage,
  onChangeItemsPerPage,
  pagination,
  isLoading,
  browserFields,
  columnSettings: { columns, columnVisibility, handleResetColumns, handleToggleColumn, sorting },
}) => {
  const [expanded, setExpanded] = useState<Indicator>();

  const fieldTypes = useFieldTypes();

  const renderCellValue = useMemo(
    () => cellRendererFactory(pagination.pageIndex * pagination.pageSize),
    [pagination.pageIndex, pagination.pageSize]
  );

  const indicatorTableContextValue = useMemo<IndicatorsTableContextValue>(
    () => ({ expanded, setExpanded, indicators }),
    [expanded, indicators]
  );

  const start = pagination.pageIndex * pagination.pageSize;
  const end = start + pagination.pageSize;

  const leadingControlColumns = useMemo(
    () => [
      {
        id: 'Actions',
        width: 72,
        headerCellRender: () => (
          <FormattedMessage
            id="xpack.threatIntelligence.indicator.table.actionColumnLabel"
            defaultMessage="Actions"
          />
        ),
        rowCellRender: renderCellValue,
      },
    ],
    [renderCellValue]
  );

  const mappedColumns = useMemo(
    () =>
      columns.map((col: EuiDataGridColumn) => {
        return {
          ...col,
          isSortable: col.id !== RawIndicatorFieldId.Id && browserFields[col.id]?.aggregatable,
          schema: getFieldSchema(fieldTypes[col.id]),
          cellActions: [
            ({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) => (
              <CellActions
                rowIndex={rowIndex}
                columnId={columnId}
                Component={Component}
                indicators={indicators}
                pagination={pagination}
              />
            ),
          ],
        };
      }),
    [browserFields, columns, fieldTypes, indicators, pagination]
  );

  const toolbarOptions = useToolbarOptions({
    browserFields,
    start,
    end,
    indicatorCount,
    columns,
    onResetColumns: handleResetColumns,
    onToggleColumn: handleToggleColumn,
  });

  const flyoutFragment = useMemo(
    () =>
      expanded ? (
        <IndicatorsFlyout indicator={expanded} closeFlyout={() => setExpanded(undefined)} />
      ) : null,
    [expanded]
  );

  const gridFragment = useMemo(() => {
    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiPanel hasShadow={false} hasBorder={false} paddingSize="xl">
              <EuiLoadingSpinner size="xl" />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (!indicatorCount) {
      return <EmptyState />;
    }

    return (
      <EuiDataGrid
        aria-labelledby="indicators-table"
        leadingControlColumns={leadingControlColumns}
        rowCount={indicatorCount}
        renderCellValue={renderCellValue}
        toolbarVisibility={toolbarOptions}
        pagination={{
          ...pagination,
          onChangeItemsPerPage,
          onChangePage,
        }}
        gridStyle={gridStyle}
        data-test-subj={TABLE_TEST_ID}
        sorting={sorting}
        columnVisibility={columnVisibility}
        columns={mappedColumns}
      />
    );
  }, [
    columnVisibility,
    mappedColumns,
    indicatorCount,
    leadingControlColumns,
    isLoading,
    onChangeItemsPerPage,
    onChangePage,
    pagination,
    renderCellValue,
    sorting,
    toolbarOptions,
  ]);

  return (
    <div>
      <IndicatorsTableContext.Provider value={indicatorTableContextValue}>
        {flyoutFragment}
        {gridFragment}
      </IndicatorsTableContext.Provider>
    </div>
  );
};
