/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { get } from 'lodash';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { AlertsTable, AlertsData } from '../alerts_table';
import { useFetchAlertsData } from '../hooks/alerts_data';
// import { mockAlertData } from './alerts_page.mock.data';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props {}

const consumers = [
  AlertConsumers.APM,
  AlertConsumers.LOGS,
  AlertConsumers.UPTIME,
  AlertConsumers.INFRASTRUCTURE,
];
const AlertsPage: React.FunctionComponent<Props> = (props: Props) => {
  const [showCheckboxes] = useState(false);

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
    renderCellValue: (
      alerts: AlertsData,
      offset: number,
      cellProps: EuiDataGridCellValueElementProps
    ) => {
      const row = alerts[cellProps.rowIndex - offset];
      if (row) {
        const val = get(row, cellProps.columnId);
        if (val.length === 1) {
          return val[0];
        }
      }
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
