/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { get } from 'lodash';
import { EuiDataGrid } from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { AbortError } from '../../../../../../../../src/plugins/kibana_utils/common';
import {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
  ParsedTechnicalFields,
} from '../../../../../../rule_registry/common';
import { useKibana } from '../../../../common/lib/kibana';

export const AlertsList: React.FunctionComponent = () => {
  const { data, notifications } = useKibana().services;

  const [alerts, setAlerts] = useState<ParsedTechnicalFields[]>([]);
  const [alertsTotal, setAlertsTotal] = useState<number>(0);

  function fetch() {
    const abortController = new AbortController();
    const request: RuleRegistrySearchRequest = {
      featureId: AlertConsumers.LOGS,
    };

    data.search
      .search<RuleRegistrySearchRequest, RuleRegistrySearchResponse>(request, {
        strategy: 'ruleRegistrySearchStrategy',
        abortSignal: abortController.signal,
      })
      .subscribe({
        next: (res) => {
          console.log({ res })
          const alertsResponse = res.rawResponse.hits.hits.map((hit) => hit._source);
          setAlerts(alertsResponse);
          setAlertsTotal(res.total ?? 0);
        },
        error: (e) => {
          if (e instanceof AbortError) {
            notifications.toasts.addWarning({
              title: e.message,
            });
          } else {
            notifications.toasts.addDanger({
              title: 'Failed to run search',
              text: e.message,
            });
          }
        },
      });
  }

  useEffect(() => {
    fetch();
  }, []);

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
  const [visibleColumns, setVisibleColumns] = useState(
    columns.map(({ id }) => id) // initialize to the full set of columns
  );

  const RenderCellValue = ({ rowIndex, columnId, setCellProps }) => {
    const row = alerts[rowIndex];
    console.log({ rowIndex, columnId })
    return get(row, columnId);
  }

  return (
    <EuiDataGrid
      aria-label="Data grid demo"
      columns={columns}
      columnVisibility={{ visibleColumns, setVisibleColumns }}
      // trailingControlColumns={trailingControlColumns}
      rowCount={alertsTotal}
      renderCellValue={RenderCellValue}
      // inMemory={{ level: 'sorting' }}
      // sorting={{ columns: sortingColumns, onSort }}
      // pagination={{
      //   ...pagination,
      //   pageSizeOptions: [10, 50, 100],
      //   onChangeItemsPerPage: onChangeItemsPerPage,
      //   onChangePage: onChangePage,
      // }}
      // onColumnResize={onColumnResize.current}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertsList as default };
