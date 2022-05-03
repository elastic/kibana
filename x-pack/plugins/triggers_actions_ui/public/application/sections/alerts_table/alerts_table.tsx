/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Suspense, lazy, useCallback, useMemo, useEffect } from 'react';
import {
  EuiDataGrid,
  EuiEmptyPrompt,
  EuiDataGridCellValueElementProps,
  EuiDataGridCellValueProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiButtonIcon,
  EuiDataGridStyle,
} from '@elastic/eui';
import { useSorting, usePagination } from './hooks';
import { AlertsTableProps, AlertsField } from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
import {
  ALERTS_TABLE_CONF_ERROR_MESSAGE,
  ALERTS_TABLE_CONF_ERROR_TITLE,
  ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL,
  ALERTS_TABLE_CONTROL_COLUMNS_VIEW_DETAILS_LABEL,
} from './translations';
import './alerts_table.scss';

export const ACTIVE_ROW_CLASS = 'alertsTableActiveRow';

const AlertsFlyout = lazy(() => import('./alerts_flyout'));

const emptyConfiguration = {
  id: '',
  columns: [],
};

const AlertsTable: React.FunctionComponent<AlertsTableProps> = (props: AlertsTableProps) => {
  const [rowClasses, setRowClasses] = useState<EuiDataGridStyle['rowClasses']>({});
  const { activePage, alertsCount, onPageChange, onSortChange } = props.useFetchAlertsData();
  const { sortingColumns, onSort } = useSorting(onSortChange);
  const {
    pagination,
    onChangePageSize,
    onChangePageIndex,
    onPaginateFlyoutNext,
    onPaginateFlyoutPrevious,
    flyoutAlertIndex,
    setFlyoutAlertIndex,
  } = usePagination({
    onPageChange,
    pageIndex: activePage,
    pageSize: props.pageSize,
    alertsCount,
  });

  const alertsTableConfigurationRegistry = useKibana().services.alertsTableConfigurationRegistry;
  const hasAlertsTableConfiguration = alertsTableConfigurationRegistry.has(props.configurationId);
  const alertsTableConfiguration = hasAlertsTableConfiguration
    ? alertsTableConfigurationRegistry.get(props.configurationId)
    : emptyConfiguration;

  const [visibleColumns, setVisibleColumns] = useState(
    alertsTableConfiguration.columns.map(({ id }) => id)
  );

  const leadingControlColumns = useMemo(() => {
    return [
      {
        id: 'expandColumn',
        width: 50,
        headerCellRender: () => {
          return (
            <span data-test-subj="expandColumnHeaderLabel">
              {ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL}
            </span>
          );
        },
        rowCellRender: (cveProps: EuiDataGridCellValueElementProps) => {
          const { visibleRowIndex } = cveProps as EuiDataGridCellValueElementProps & {
            visibleRowIndex: number;
          };
          return (
            <EuiFlexGroup gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={ALERTS_TABLE_CONTROL_COLUMNS_VIEW_DETAILS_LABEL}>
                  <EuiButtonIcon
                    size="s"
                    iconType="expand"
                    color="text"
                    onClick={() => {
                      setFlyoutAlertIndex(visibleRowIndex);
                    }}
                    data-test-subj={`expandColumnCellOpenFlyoutButton-${visibleRowIndex}`}
                    aria-label={ALERTS_TABLE_CONTROL_COLUMNS_VIEW_DETAILS_LABEL}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      ...props.leadingControlColumns,
    ];
  }, [props.leadingControlColumns, setFlyoutAlertIndex]);

  useEffect(() => {
    // Row classes do not deal with visible row indices so we need to handle page offset
    const rowIndex = flyoutAlertIndex + pagination.pageIndex * pagination.pageSize;
    setRowClasses({
      [rowIndex]: ACTIVE_ROW_CLASS,
    });
  }, [flyoutAlertIndex, pagination.pageIndex, pagination.pageSize]);

  const handleFlyoutClose = useCallback(() => setFlyoutAlertIndex(-1), [setFlyoutAlertIndex]);

  return hasAlertsTableConfiguration ? (
    <section data-test-subj={props['data-test-subj']}>
      {flyoutAlertIndex > -1 && (
        <Suspense fallback={null}>
          <AlertsFlyout
            alert={props.alerts[flyoutAlertIndex]}
            onClose={handleFlyoutClose}
            onPaginateNext={onPaginateFlyoutNext}
            onPaginatePrevious={onPaginateFlyoutPrevious}
          />
        </Suspense>
      )}
      <EuiDataGrid
        aria-label="Alerts table"
        data-test-subj="alertsTable"
        columns={alertsTableConfiguration.columns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        trailingControlColumns={props.trailingControlColumns}
        leadingControlColumns={leadingControlColumns}
        rowCount={alertsCount}
        renderCellValue={(improper: EuiDataGridCellValueElementProps) => {
          const rcvProps = improper as EuiDataGridCellValueElementProps & EuiDataGridCellValueProps;
          const alert = props.alerts[rcvProps.visibleRowIndex];
          return props.renderCellValue({
            ...rcvProps,
            alert,
            field: rcvProps.columnId as AlertsField,
          });
        }}
        gridStyle={{ rowClasses }}
        sorting={{ columns: sortingColumns, onSort }}
        pagination={{
          ...pagination,
          pageSizeOptions: props.pageSizeOptions,
          onChangeItemsPerPage: onChangePageSize,
          onChangePage: onChangePageIndex,
        }}
      />
    </section>
  ) : (
    <EuiEmptyPrompt
      data-test-subj="alertsTableNoConfiguration"
      iconType="watchesApp"
      title={<h2>{ALERTS_TABLE_CONF_ERROR_TITLE}</h2>}
      body={<p>{ALERTS_TABLE_CONF_ERROR_MESSAGE}</p>}
    />
  );
};

export { AlertsTable };
// eslint-disable-next-line import/no-default-export
export { AlertsTable as default };
