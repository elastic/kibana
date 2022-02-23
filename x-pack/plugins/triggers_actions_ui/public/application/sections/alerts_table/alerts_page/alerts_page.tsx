/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { EuiDataGridControlColumn, EuiDataGridCellValueElementProps } from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { Sort, AlertsTable } from '../alerts_table';
import { mockAlertData } from './alerts_page.mock.data';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props {}

const AlertsPage: React.FunctionComponent<Props> = (props: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showCheckboxes] = useState(false);
  const [alerts, setAlerts] = useState({});

  const onColumnsChange = (columns: EuiDataGridControlColumn[]) => {};
  const onPageChange = (pageNumber: number, limit: number) => {};
  const onSortChange = (sort: Sort[]) => {};
  const useFetchAlertData = () => {
    return {
      activePage: 0,
      alerts,
      isInitializing,
      isLoading,
      getInspectQuery: () => {
        return { request: {}, response: {} };
      },
      onColumnsChange,
      onPageChange,
      onSortChange,
      refresh: () => {},
      alertCount: 1,
    };
  };

  async function search() {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setAlerts(mockAlertData.rawResponse.fields);
    setIsLoading(false);
    setIsInitializing(false);
  }

  useEffect(() => {
    search();
  }, []);

  const tableProps = {
    consumers: [AlertConsumers.OBSERVABILITY],
    bulkActions: [],
    columns: [
      {
        id: 'name',
      },
    ],
    deletedEventIds: [],
    disabledCellActions: [],
    itemsPerPage: 10,
    itemsPerPageOptions: [10, 20, 50, 100],
    leadingControlColumns: [],

    renderCellValue: (cellProps: EuiDataGridCellValueElementProps) => {
      return null;
    },
    showCheckboxes,
    trailingControlColumns: [],
    useFetchAlertData,
    ...useFetchAlertData(),
  };
  return <AlertsTable {...tableProps} />;
};

export { AlertsPage };
