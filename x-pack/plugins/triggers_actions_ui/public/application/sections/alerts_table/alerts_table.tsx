/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import {
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridCellValueElementProps,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useKibana } from '../../../common/lib/kibana';
import {
  RuleRegistrySearchRequestPagination,
  RuleRegistrySearchRequestSort,
} from '../../../../../rule_registry/common';
import { QueryBar, useQueryBar, Provider, alertsPageStateContainer } from './query_bar';
import { getVisibleAlertConsumers } from './get_visible_alert_consumers';
import { useFetchDataViews, usePagination, useSorting } from './hooks';
import { UseFetchAlertsDataProps } from './hooks/alerts_data';

interface BulkActionsObjectProp {
  alertStatusActions?: boolean;
  onAlertStatusActionSuccess?: void;
  onAlertStatusActionFailure?: void;
}

export type AlertsData = Record<string, any[]>;

export interface FetchAlertData {
  activePage: number;
  alerts: AlertsData;
  isInitializing: boolean;
  isLoading: boolean;
  getInspectQuery: () => { request: {}; response: {} };
  onColumnsChange: (columns: EuiDataGridControlColumn[]) => void;
  onPageChange: (pagination: RuleRegistrySearchRequestPagination) => void;
  onSortChange: (sort: RuleRegistrySearchRequestSort[]) => void;
  refresh: () => void;
  alertsCount: number;
}

interface AlertsTableProps {
  consumers: AlertConsumers[];
  bulkActions: BulkActionsObjectProp;
  columns: EuiDataGridColumn[];
  // defaultCellActions: TGridCellAction[];
  deletedEventIds: string[];
  disabledCellActions: string[];
  pageSize: number;
  pageSizeOptions: number[];
  leadingControlColumns: EuiDataGridControlColumn[];
  renderCellValue: (
    alerts: AlertsData,
    offset: number,
    props: EuiDataGridCellValueElementProps
  ) => React.ReactNode;
  showCheckboxes: boolean;
  trailingControlColumns: EuiDataGridControlColumn[];
  useFetchAlertsData: (props: UseFetchAlertsDataProps) => FetchAlertData;
}

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
  const { alerts, refresh, alertsCount, onSortChange, onPageChange, activePage } =
    props.useFetchAlertsData({
      consumers: props.consumers,
    });
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
        aria-label="Data grid demo"
        columns={props.columns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        trailingControlColumns={props.trailingControlColumns}
        rowCount={alertsCount}
        renderCellValue={(cellProps: EuiDataGridCellValueElementProps) =>
          props.renderCellValue(alerts, activePage * pagination.pageSize, cellProps)
        }
        // inMemory={{ level: 'sorting' }}
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
