/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import { EuiDataGrid, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { QueryBar, useQueryBar, Provider, alertsPageStateContainer } from './query_bar';
import { getVisibleAlertConsumers } from './lib/get_visible_alert_consumers';
import { useFetchDataViews, useSorting, usePagination } from './hooks';
import { AlertsTableProps } from '../../../types';

const AlertsTableComponent: React.FunctionComponent<AlertsTableProps> = (
  props: AlertsTableProps
) => {
  /**
    To figure out which alerts indice(s) users can have access.
    To search alerts with its own search strategy and it will be completely decoupled from the timeline search strategy. We still manage RBAC around the alerts and we will only use the fields API from elasticsearch.
    To hide/show actions through RBAC
    To filter the alerts with a filter in DSL prop which can contain timerange and alert status etc..
    To multiple sort on columns
    To add bulk actions on alerts
    To add fields outside of the columns selection like we do with our BrowserFields component.
    To handle the pagination in the alert details flyout
    To keep the latest configuration of the alert table in localstorage
    To source it's data from the newly added search strategy and leverage the stream architecture to support large amounts of alerts using the newly created React hook.
   */
  const {
    http,
    data,
    application: { capabilities },
    kibanaFeatures,
  } = useKibana().services;
  const {
    activePage,
    alertsCount,
    // isInitializing,
    // isLoading,
    // getInspectQuery,
    onPageChange,
    onSortChange,
    refresh,
  } = props.useFetchAlertsData();
  const { sortingColumns, onSort } = useSorting(onSortChange);
  const { pagination, onChangePageSize, onChangePageIndex } = usePagination({
    onPageChange,
    pageIndex: activePage,
    pageSize: props.pageSize,
  });

  const { onQueryBarQueryChange, rangeFrom, rangeTo, kuery } = useQueryBar(data, refresh);
  const visibleConsumers = useMemo(() => {
    return getVisibleAlertConsumers(capabilities, kibanaFeatures, props.consumers);
  }, [props.consumers, capabilities, kibanaFeatures]);
  const { dataViews } = useFetchDataViews(visibleConsumers, http, data);
  const [visibleColumns, setVisibleColumns] = useState(props.columns.map(({ id }) => id));

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={true}>
          <QueryBar
            dataViews={dataViews}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            query={kuery}
            onQueryChange={onQueryBarQueryChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiDataGrid
        aria-label="Alerts table"
        columns={props.columns}
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
    </>
  );
};

export function AlertsTable(props: AlertsTableProps) {
  return (
    <Provider value={alertsPageStateContainer}>
      <AlertsTableComponent {...props} />
    </Provider>
  );
}

// eslint-disable-next-line import/no-default-export
export { AlertsTable as default };
