/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridCellValueElementProps,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { get } from 'lodash';
import { AlertConsumers } from '@kbn/rule-data-utils';
import {
  // RuleRegistrySearchRequest,
  // RuleRegistrySearchResponse,
  ParsedTechnicalFields,
} from '../../../../../rule_registry/common';
import { useKibana } from '../../../common/lib/kibana';
import { QueryBar, useQueryBar, Provider, alertsPageStateContainer } from './query_bar';
import { getVisibleAlertConsumers } from './get_visible_alert_consumers';
import { useFetchDataViews, usePagination, useSorting } from './hooks';

interface BulkActionsObjectProp {
  alertStatusActions?: boolean;
  onAlertStatusActionSuccess?: void;
  onAlertStatusActionFailure?: void;
}

interface Sort {
  columnId: string;
  columnType: string;
  sortDirection: 'asc' | 'desc';
}

interface AlertsTableProps {
  activePage: number;
  consumers: AlertConsumers[];
  bulkActions: BulkActionsObjectProp;
  columns: EuiDataGridColumn[];
  alerts: Record<string, any>;
  // defaultCellActions: TGridCellAction[];
  deletedEventIds: string[];
  disabledCellActions: string[];
  getInspectQuery: () => { request: {}; response: {} };
  isInitializing: boolean;
  isLoading: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  leadingControlColumns: EuiDataGridControlColumn[];
  onColumnsChange: (columns: EuiDataGridControlColumn[]) => void;
  onPageChange: (pageNumber: number, limit: number) => void;
  onSortChange: (sort: Sort[]) => void;
  renderCellValue: (props: EuiDataGridCellValueElementProps) => React.ReactNode;
  showCheckboxes: boolean;
  trailingControlColumns: EuiDataGridControlColumn[];
}

const useFetchAlertData = () => {
  return {
    fetchData: () => {},
  };
};

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

  const [alerts, setAlerts] = useState<ParsedTechnicalFields[]>([]);
  const [alertsTotal, setAlertsTotal] = useState<number>(0);
  const { sortingColumns, onSort } = useSorting();
  const { pagination, onChangeItemsPerPage, onChangePage } = usePagination();
  const { fetchData } = useFetchAlertData();
  const { onQueryBarQueryChange, rangeFrom, rangeTo, kuery } = useQueryBar(data, fetchData);
  const visibleConsumers = getVisibleAlertConsumers(capabilities, kibanaFeatures, props.consumers);
  const { dataViews } = useFetchDataViews(visibleConsumers, http, data);

  const columns = [
    {
      id: 'kibana.alert.rule.name',
      displayAsText: 'Name',
    },
    {
      id: 'kibana.alert.rule.category',
      displayAsText: 'Category',
    },
  ];

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

  const RenderCellValue = ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
    const row = alerts[rowIndex];
    return get(row, columnId) ?? 'N/A';
  };

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
        columns={columns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        trailingControlColumns={props.trailingControlColumns}
        rowCount={alertsTotal}
        renderCellValue={RenderCellValue}
        inMemory={{ level: 'sorting' }}
        sorting={{ columns: sortingColumns, onSort }}
        pagination={{
          ...pagination,
          pageSizeOptions: [10, 50, 100],
          onChangeItemsPerPage,
          onChangePage,
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
