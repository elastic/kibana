/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiDataGrid, EuiEmptyPrompt } from '@elastic/eui';
import { useSorting, usePagination } from './hooks';
import { AlertsTableProps } from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
import { ALERTS_TABLE_CONF_ERROR_MESSAGE, ALERTS_TABLE_CONF_ERROR_TITLE } from './translations';

const emptyConfiguration = {
  id: '',
  columns: [],
};

const AlertsTable: React.FunctionComponent<AlertsTableProps> = (props: AlertsTableProps) => {
  const { activePage, alertsCount, onPageChange, onSortChange } = props.useFetchAlertsData();
  const { sortingColumns, onSort } = useSorting(onSortChange);
  const { pagination, onChangePageSize, onChangePageIndex } = usePagination({
    onPageChange,
    pageIndex: activePage,
    pageSize: props.pageSize,
  });

  const alertsTableConfigurationRegistry = useKibana().services.alertsTableConfigurationRegistry;
  const hasAlertsTableConfiguration = alertsTableConfigurationRegistry.has(props.configurationId);

  const alertsTableConfiguration = hasAlertsTableConfiguration
    ? alertsTableConfigurationRegistry.get(props.configurationId)
    : emptyConfiguration;

  const [visibleColumns, setVisibleColumns] = useState(
    alertsTableConfiguration.columns.map(({ id }) => id)
  );

  return hasAlertsTableConfiguration ? (
    <section data-test-subj={props['data-test-subj']}>
      <EuiDataGrid
        aria-label="Alerts table"
        columns={alertsTableConfiguration.columns}
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
  ) : (
    <EuiEmptyPrompt
      data-test-subj="alerts-table-no-configuration"
      iconType="watchesApp"
      title={<h2>{ALERTS_TABLE_CONF_ERROR_TITLE}</h2>}
      body={<p>{ALERTS_TABLE_CONF_ERROR_MESSAGE}</p>}
    />
  );
};

export { AlertsTable };
// eslint-disable-next-line import/no-default-export
export { AlertsTable as default };
