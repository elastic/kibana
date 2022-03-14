/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiDataGridCellValueElementProps, EuiDataGridControlColumn } from '@elastic/eui';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { RuleRegistrySearchRequestPagination } from '../../../../../../rule_registry/common';
import { AlertsTable, AlertsData } from '../alerts_table';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props {}

const consumers = [
  AlertConsumers.APM,
  AlertConsumers.LOGS,
  AlertConsumers.UPTIME,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.SIEM,
];
const AlertsPage: React.FunctionComponent<Props> = (props: Props) => {
  const [showCheckboxes] = useState(false);

  const useFetchAlertsData = () => {
    return {
      activePage: 1,
      alerts: {} as AlertsData,
      isInitializing: false,
      isLoading: false,
      getInspectQuery: () => ({ request: {}, response: {} }),
      onColumnsChange: (columns: EuiDataGridControlColumn[]) => {},
      onPageChange: (pagination: RuleRegistrySearchRequestPagination) => {},
      onSortChange: (sort: estypes.SortCombinations[]) => {},
      refresh: () => {},
    };
  };

  const tableProps = {
    consumers,
    bulkActions: [],
    columns: [
      {
        id: 'kibana.alert.rule.name',
        displayAsText: 'Name',
      },
      {
        id: 'kibana.alert.rule.category',
        displayAsText: 'Category',
      },
    ],
    deletedEventIds: [],
    disabledCellActions: [],
    pageSize: 20,
    pageSizeOptions: [2, 5, 10, 20, 50, 100],
    leadingControlColumns: [],
    renderCellValue: (cellProps: EuiDataGridCellValueElementProps) => {
      return 'N/A';
    },
    showCheckboxes,
    trailingControlColumns: [],
    useFetchAlertsData,
  };

  return (
    <>
      <AlertsTable {...tableProps} />
    </>
  );
};

export { AlertsPage };
