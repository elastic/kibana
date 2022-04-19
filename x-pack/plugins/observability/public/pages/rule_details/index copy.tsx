/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';

// import {
//   ALERT_DURATION,
//   ALERT_EVALUATION_VALUE,
//   ALERT_REASON,
//   ALERT_RULE_CATEGORY,
//   ALERT_RULE_NAME,
//   ALERT_STATUS,
//   ALERT_UUID,
//   TIMESTAMP,
//   ALERT_START,
// } from '@kbn/rule-data-utils';
// import { EuiDataGridColumn } from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
// import type { AlertsTableProps } from '../../../../triggers_actions_ui/public/types';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { get } from 'lodash';
import { useParams } from 'react-router-dom';
import type {
  AlertsTableProps,
  AlertsData,
  BulkActionsObjectProp,
} from '../../../../triggers_actions_ui/public';

import {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
  RuleRegistrySearchRequestPagination,
} from '../../../../rule_registry/common';

import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';

// import { translations } from '../../config';

// export const columns: Array<
//   Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'>
// > = [
//   {
//     displayAsText: translations.alertsTable.statusColumnDescription,
//     id: ALERT_STATUS,
//     initialWidth: 110,
//   },
//   {
//     displayAsText: translations.alertsTable.lastUpdatedColumnDescription,
//     id: TIMESTAMP,
//     initialWidth: 230,
//   },
//   {
//     displayAsText: translations.alertsTable.durationColumnDescription,
//     id: ALERT_DURATION,
//     initialWidth: 116,
//   },
//   {
//     displayAsText: translations.alertsTable.reasonColumnDescription,
//     id: ALERT_REASON,
//   },
// ];
// const tableProps = {
//   consumers,
//   bulkActions: [],
//   columns,
//   deletedEventIds: [],
//   disabledCellActions: [],
//   pageSize: 1,
//   pageSizeOptions: [1, 2, 5, 10, 20, 50, 100],
//   leadingControlColumns: [],
//   renderCellValue: jest.fn().mockImplementation((props) => {
//     return `${props.colIndex}:${props.rowIndex}`;
//   }),
//   showCheckboxes: false,
//   trailingControlColumns: [],
//   useFetchAlertsData,
//   'data-test-subj': 'testTable',
// };
interface RuleDetailsPathParams {
  ruleId: string;
}
export function RuleDetailPage() {
  const { ruleId } = useParams<RuleDetailsPathParams>();
  const defaultPagination = {
    pageSize: 10,
    pageIndex: 0,
  };
  const defaultSort: estypes.SortCombinations[] = [
    {
      'event.action': {
        order: 'asc',
      },
    },
  ];
  const { ObservabilityPageTemplate } = usePluginContext();
  const { triggersActionsUi, http, data } = useKibana().services;
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [alertsCount, setAlertsCount] = useState(0);
  const [alerts, setAlerts] = useState<AlertsData[]>([]);
  const [sort, setSort] = useState<estypes.SortCombinations[]>(defaultSort);
  const [pagination, setPagination] = useState(defaultPagination);

  const onPageChange = (_pagination: RuleRegistrySearchRequestPagination) => {
    setPagination(_pagination);
  };
  const onSortChange = (_sort: Array<{ id: string; direction: 'asc' | 'desc' }>) => {
    setSort(
      _sort.map(({ id, direction }) => {
        return {
          [id]: {
            order: direction,
          },
        };
      })
    );
  };

  const asyncSearch = useCallback(() => {
    const consumers = [
      AlertConsumers.APM,
      AlertConsumers.LOGS,
      AlertConsumers.UPTIME,
      AlertConsumers.INFRASTRUCTURE,
    ];
    setIsLoading(true);
    const abortController = new AbortController();
    const request: RuleRegistrySearchRequest = {
      featureIds: consumers,
      sort,
      pagination,
    };
    data.search
      .search<RuleRegistrySearchRequest, RuleRegistrySearchResponse>(request, {
        strategy: 'privateRuleRegistryAlertsSearchStrategy',
        abortSignal: abortController.signal,
      })
      .subscribe({
        next: (res) => {
          const alertsResponse = res.rawResponse.hits.hits.map(
            (hit: any) => hit.fields as unknown as AlertsData
          ) as AlertsData[];
          setAlerts(alertsResponse);
          const total = !isNaN(res.rawResponse.hits.total as number)
            ? (res.rawResponse.hits.total as number)
            : (res.rawResponse.hits.total as estypes.SearchTotalHits).value ?? 0;
          setAlertsCount(total);
          setIsLoading(false);
          console.log(alertsResponse);
        },
        error: (e) => {
          console.log(e);
          setIsLoading(false);
        },
      });
    setIsInitializing(false);
  }, [data.search, sort, pagination]);

  useEffect(() => {
    asyncSearch();
  }, [asyncSearch]);
  const columns = [
    {
      id: 'event.action',
      displayAsText: 'Alert status',
      initialWidth: 150,
    },
    {
      id: '@timestamp',
      displayAsText: 'Last updated',
      initialWidth: 250,
    },
    {
      id: 'kibana.alert.duration.us',
      displayAsText: 'Duration',
      initialWidth: 150,
    },
    {
      id: 'kibana.alert.reason',
      displayAsText: 'Reason',
    },
  ];

  const fetchAlertsData = {
    activePage: 0,
    alerts,
    alertsCount: alerts.length,
    isInitializing: false,
    isLoading: false,
    getInspectQuery: () => ({ request: {}, response: {} }),
    onColumnsChange: () => {},
    onPageChange,
    onSortChange,
    refresh: () => {},
  };
  const useFetchAlertsData = () => {
    return fetchAlertsData;
  };

  const tableProps: AlertsTableProps = {
    consumers: ['observability'] as AlertConsumers[],
    bulkActions: [] as BulkActionsObjectProp,
    columns,
    deletedEventIds: [],
    disabledCellActions: [],
    pageSize: 10,
    pageSizeOptions: [1, 2, 5, 10, 20, 50, 100],
    leadingControlColumns: [],
    renderCellValue: (rcvProps: EuiDataGridCellValueElementProps) => {
      const { columnId, visibleRowIndex } = rcvProps as EuiDataGridCellValueElementProps & {
        visibleRowIndex: number;
      };
      const value = (get(alerts[visibleRowIndex], columnId) ?? [])[0];
      console.log(value);
      return value ?? 'N/A';
    },
    showCheckboxes: false,
    trailingControlColumns: [],
    useFetchAlertsData,
    'data-test-subj': 'testTable',
  };
  console.log('ruleId', ruleId);
  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <>Detail Page</>,
      }}
    >
      {triggersActionsUi.getAlertsTable({
        ...tableProps,
      })}
      {/* <h1>Hello</h1> */}
      {/* <ExecutionDurationChart
        executionDuration={ruleSummary.executionDuration}
        numberOfExecutions={numberOfExecutions}
        onChangeDuration={onChangeDuration}
        isLoading={isLoadingChart}
      /> */}
    </ObservabilityPageTemplate>
  );
}
