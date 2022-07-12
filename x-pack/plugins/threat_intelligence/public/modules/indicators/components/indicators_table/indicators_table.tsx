/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC, useState, useMemo } from 'react';
import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { Indicator, RawIndicatorFieldId } from '../../../../../common/types/Indicator';
import { UseIndicatorsValue } from '../../hooks/use_indicators';
import { cellRendererFactory, ComputedIndicatorFieldId } from './cell_renderer';
import { ActionsRowCell } from './actions_row_cell';

interface Column {
  id: RawIndicatorFieldId | ComputedIndicatorFieldId;
  displayAsText: string;
}

const columns: Column[] = [
  {
    id: ComputedIndicatorFieldId.DisplayValue,
    displayAsText: 'Indicator',
  },
  {
    id: RawIndicatorFieldId.Type,
    displayAsText: 'Indicator type',
  },
  {
    id: RawIndicatorFieldId.Feed,
    displayAsText: 'Feed',
  },
  {
    id: RawIndicatorFieldId.FirstSeen,
    displayAsText: 'First seen',
  },
  {
    id: RawIndicatorFieldId.LastSeen,
    displayAsText: 'Last seen',
  },
  {
    id: RawIndicatorFieldId.MarkingTLP,
    displayAsText: 'TLP Marking',
  },
];

export type IndicatorsTableProps = UseIndicatorsValue;

export const IndicatorsTable: VFC<IndicatorsTableProps> = ({
  indicators,
  indicatorCount,
  onChangePage,
  onChangeItemsPerPage,
  pagination,
  firstLoad,
}) => {
  const [visibleColumns, setVisibleColumns] = useState<Array<Column['id']>>(
    columns.map((column) => column.id)
  );
  const renderCellValue = useMemo(
    () => cellRendererFactory(indicators, pagination.pageIndex * pagination.pageSize),
    [indicators, pagination.pageIndex, pagination.pageSize]
  );

  const start = pagination.pageIndex * pagination.pageSize;
  const end = start + pagination.pageSize;

  if (firstLoad) {
    return <EuiLoadingSpinner size="m" />;
  }

  const leadingControlColumns = [
    {
      id: 'Actions',
      width: 72,
      headerCellRender: () => (
        <FormattedMessage
          id="xpack.threatIntelligence.indicator.table.actionColumnLabel"
          defaultMessage="Actions"
        />
      ),
      rowCellRender: (cveProps: EuiDataGridCellValueElementProps) => {
        const indicator: Indicator = indicators[cveProps.rowIndex];
        return <ActionsRowCell indicator={indicator} />;
      },
    },
  ];

  return (
    <div>
      <EuiDataGrid
        aria-labelledby={'indicators-table'}
        leadingControlColumns={leadingControlColumns}
        columns={columns}
        columnVisibility={{
          visibleColumns,
          setVisibleColumns: setVisibleColumns as (cols: string[]) => void,
        }}
        rowCount={indicatorCount}
        renderCellValue={renderCellValue}
        toolbarVisibility={{
          showDisplaySelector: false,
          showFullScreenSelector: false,
          additionalControls: {
            left: {
              prepend: (
                <EuiText style={{ display: 'inline' }} size="xs">
                  Showing {start + 1}-{end > indicatorCount ? indicatorCount : end} of{' '}
                  {indicatorCount} indicators
                </EuiText>
              ),
            },
          },
        }}
        pagination={{
          ...pagination,
          onChangeItemsPerPage,
          onChangePage,
        }}
        gridStyle={{
          border: 'horizontal',
          header: 'underline',
          cellPadding: 'm',
          fontSize: 's',
        }}
      />
    </div>
  );
};
