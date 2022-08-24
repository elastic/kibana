/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC, useState, useMemo, useEffect, useCallback } from 'react';
import {
  EuiDataGrid,
  EuiDataGridColumnCellActionProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiDataGridColumn } from '@elastic/eui/src/components/datagrid/data_grid_types';
import { BrowserFields, SecuritySolutionDataViewBase } from '../../../../types';
import { Indicator, RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { cellRendererFactory, ComputedIndicatorFieldId } from './cell_renderer';
import { EmptyState } from '../../../../components/empty_state';
import { AddToTimeline } from '../../../timeline/components/add_to_timeline';
import { IndicatorsTableContext, IndicatorsTableContextValue } from './context';
import { IndicatorsFlyout } from '../indicators_flyout/indicators_flyout';
import { Pagination } from '../../hooks/use_indicators';
import { useToolbarOptions } from './hooks/use_toolbar_options';

const defaultColumns: EuiDataGridColumn[] = [
  {
    id: RawIndicatorFieldId.TimeStamp,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.timestampColumnTitle', {
      defaultMessage: '@timestamp',
    }),
  },
  {
    id: ComputedIndicatorFieldId.DisplayValue,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.indicatorColumTitle', {
      defaultMessage: 'Indicator',
    }),
  },
  {
    id: RawIndicatorFieldId.Type,
    displayAsText: i18n.translate(
      'xpack.threatIntelligence.indicator.table.indicatorTypeColumTitle',
      {
        defaultMessage: 'Indicator type',
      }
    ),
  },
  {
    id: RawIndicatorFieldId.Feed,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.FeedColumTitle', {
      defaultMessage: 'Feed',
    }),
  },
  {
    id: RawIndicatorFieldId.FirstSeen,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.firstSeenColumTitle', {
      defaultMessage: 'First seen',
    }),
  },
  {
    id: RawIndicatorFieldId.LastSeen,
    displayAsText: i18n.translate('xpack.threatIntelligence.indicator.table.lastSeenColumTitle', {
      defaultMessage: 'Last seen',
    }),
  },
];

export interface IndicatorsTableProps {
  indicators: Indicator[];
  indicatorCount: number;
  pagination: Pagination;
  onChangeItemsPerPage: (value: number) => void;
  onChangePage: (value: number) => void;
  loading: boolean;
  indexPattern: SecuritySolutionDataViewBase;
  browserFields: BrowserFields;
}

export const TABLE_TEST_ID = 'tiIndicatorsTable';
export const CELL_TIMELINE_BUTTON_TEST_ID = 'tiIndicatorsTableCellTimelineButton';

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
  loading,
  indexPattern,
  browserFields,
}) => {
  const [columns, setColumns] = useState<EuiDataGridColumn[]>(defaultColumns);

  const [visibleColumns, setVisibleColumns] = useState<Array<EuiDataGridColumn['id']>>(
    columns.map((column) => column.id)
  );

  const [expanded, setExpanded] = useState<Indicator>();

  const renderCellValue = useMemo(
    () => cellRendererFactory(pagination.pageIndex * pagination.pageSize),
    [pagination.pageIndex, pagination.pageSize]
  );

  // field name to field type map to allow the cell_renderer to format dates
  const fieldTypesMap: { [id: string]: string } = useMemo(() => {
    if (!indexPattern) return {};

    const res: { [id: string]: string } = {};
    indexPattern.fields.map((field) => (res[field.name] = field.type));
    return res;
  }, [indexPattern]);

  const indicatorTableContextValue = useMemo<IndicatorsTableContextValue>(
    () => ({ expanded, setExpanded, indicators, fieldTypesMap }),
    [expanded, indicators, fieldTypesMap]
  );

  const start = pagination.pageIndex * pagination.pageSize;
  const end = start + pagination.pageSize;

  const flyoutFragment = useMemo(
    () =>
      expanded ? (
        <IndicatorsFlyout
          indicator={expanded}
          fieldTypesMap={fieldTypesMap}
          closeFlyout={() => setExpanded(undefined)}
        />
      ) : null,
    [expanded, fieldTypesMap]
  );

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

  const handleToggleColumn = useCallback((columnId: string) => {
    setColumns((currentColumns) => {
      const columnsMatchingId = ({ id }: EuiDataGridColumn) => id === columnId;
      const columnsNotMatchingId = (column: EuiDataGridColumn) => !columnsMatchingId(column);

      const enabled = Boolean(currentColumns.find(columnsMatchingId));

      if (enabled) {
        return currentColumns.filter(columnsNotMatchingId);
      }

      return [...currentColumns, { id: columnId as any, displayAsText: columnId }];
    });
  }, []);

  const handleResetColumns = useCallback(() => setColumns(defaultColumns), []);

  /**
   * Whenever selected columns change, we make sure they are in sync with visible cols
   */
  useEffect(() => {
    setVisibleColumns(columns.map(({ id }) => id));
  }, [columns]);

  useMemo(() => {
    columns.map(
      (col: EuiDataGridColumn) =>
        (col.cellActions = [
          ({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) => (
            <AddToTimeline
              data={indicators[rowIndex % pagination.pageSize]}
              field={columnId}
              component={Component}
              testId={CELL_TIMELINE_BUTTON_TEST_ID}
            />
          ),
        ])
    );
  }, [columns, indicators, pagination]);

  const toolbarOptions = useToolbarOptions({
    browserFields,
    start,
    end,
    indicatorCount,
    columns,
    onResetColumns: handleResetColumns,
    onToggleColumn: handleToggleColumn,
  });

  if (loading) {
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
    <div>
      <IndicatorsTableContext.Provider value={indicatorTableContextValue}>
        <EuiDataGrid
          aria-labelledby="indicators-table"
          leadingControlColumns={leadingControlColumns}
          columns={columns}
          columnVisibility={{
            visibleColumns,
            setVisibleColumns: setVisibleColumns as (cols: string[]) => void,
          }}
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
        />
        {flyoutFragment}
      </IndicatorsTableContext.Provider>
    </div>
  );
};
