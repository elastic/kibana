/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiDataGrid } from '@elastic/eui';
import { useSorting, usePagination } from './hooks';
import { AlertsTableProps } from '../../../types';
import { useKibana } from '../../../common/lib/kibana';

const AlertsTable: React.FunctionComponent<AlertsTableProps> = (props: AlertsTableProps) => {
  const { activePage, alertsCount, onPageChange, onSortChange } = props.useFetchAlertsData();
  const { sortingColumns, onSort } = useSorting(onSortChange);
  const { pagination, onChangePageSize, onChangePageIndex } = usePagination({
    onPageChange,
    pageIndex: activePage,
    pageSize: props.pageSize,
  });

  const alertsTableConfigurationRegistry = useKibana().services.alertsTableConfigurationRegistry;
  if (!alertsTableConfigurationRegistry.has(props.ownerPluginId)) {
    throw new Error(
      'This plugin has no registered its alerts table parameters inside TriggersActionsUi'
    );
  }
  const pluginCustomizations = alertsTableConfigurationRegistry.get(props.ownerPluginId);

  const [visibleColumns, setVisibleColumns] = useState(
    pluginCustomizations.columns.map(({ id }) => id)
  );

  return (
    <section data-test-subj={props['data-test-subj']}>
      <EuiDataGrid
        aria-label="Alerts table"
        columns={pluginCustomizations.columns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        trailingControlColumns={props.trailingControlColumns}
        rowCount={alertsCount}
        renderCellValue={props.renderCellValue}
        sorting={{ columns: sortingColumns, onSort }}
        pagination={{
          ...pagination,
          pageSizeOptions: props.pageSizeOptions,
          onChangeItemsPerPage: onChangePageSize,
          onChangePage: onChangePageIndex,
        }}
      />
    </section>
  );
};

export { AlertsTable };
// eslint-disable-next-line import/no-default-export
export { AlertsTable as default };
