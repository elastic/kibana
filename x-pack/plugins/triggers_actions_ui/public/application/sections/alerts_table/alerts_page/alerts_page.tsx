/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { get } from 'lodash';
import { EuiDataGridCellValueElementProps, EuiDataGridControlColumn } from '@elastic/eui';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { RuleRegistrySearchRequestPagination } from '../../../../../../rule_registry/common';
import { AlertsTable } from '../alerts_table';

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

  const mockAlertData = [
    {
      'kibana.alert.rule.name': ['Test1'],
      'kibana.alert.rule.category': ['Internal'],
    },
    {
      'kibana.alert.rule.name': ['Test2'],
      'kibana.alert.rule.category': ['Internal'],
    },
    {
      'kibana.alert.rule.name': ['Test3'],
      'kibana.alert.rule.category': ['Internal'],
    },
    {
      'kibana.alert.rule.name': ['Test4'],
      'kibana.alert.rule.category': ['Internal'],
    },
    {
      'kibana.alert.rule.name': ['Test5'],
      'kibana.alert.rule.category': ['Internal'],
    },
  ];

  const useFetchAlertsData = () => {
    return {
      activePage: 0,
      alerts: mockAlertData,
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
    pageSize: 2,
    pageSizeOptions: [2, 5, 10, 20, 50, 100],
    leadingControlColumns: [],
    renderCellValue: ({ columnId, rowIndex }: EuiDataGridCellValueElementProps) => {
      return get(mockAlertData[rowIndex], columnId, 'N/A');
    },
    showCheckboxes,
    trailingControlColumns: [],
    useFetchAlertsData,
  };

  return (
    <>
      <h1>THIS IS AN INTERNAL TEST PAGE</h1>
      <AlertsTable {...tableProps} />
    </>
  );
};

export { AlertsPage };
