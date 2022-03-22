/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { get } from 'lodash';
import {
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiProgress,
} from '@elastic/eui';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AlertConsumers } from '@kbn/rule-data-utils';
import {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
  RuleRegistrySearchRequestPagination,
} from '../../../../../../rule_registry/common';
import { AlertsTable } from '../alerts_table';
import { useKibana } from '../../../../common/lib/kibana';
import { AbortError } from '../../../../../../../../src/plugins/kibana_utils/common';
import { AlertsData } from '../../../../types';

const consumers = [
  AlertConsumers.APM,
  AlertConsumers.LOGS,
  AlertConsumers.UPTIME,
  AlertConsumers.INFRASTRUCTURE,
];

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

const AlertsPage: React.FunctionComponent = () => {
  const { data, notifications } = useKibana().services;
  const [showCheckboxes] = useState(false);
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
    setIsLoading(true);
    const abortController = new AbortController();
    const request: RuleRegistrySearchRequest = {
      featureIds: consumers,
      sort,
      pagination,
    };
    data.search
      .search<RuleRegistrySearchRequest, RuleRegistrySearchResponse>(request, {
        strategy: 'ruleRegistryAlertsSearchStrategy',
        abortSignal: abortController.signal,
      })
      .subscribe({
        next: (res) => {
          const alertsResponse = res.rawResponse.hits.hits.map(
            (hit) => hit.fields as unknown as AlertsData
          ) as AlertsData[];
          setAlerts(alertsResponse);
          const total = !isNaN(res.rawResponse.hits.total as number)
            ? (res.rawResponse.hits.total as number)
            : (res.rawResponse.hits.total as estypes.SearchTotalHits).value ?? 0;
          setAlertsCount(total);
          setIsLoading(false);
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
          setIsLoading(false);
        },
      });
    setIsInitializing(false);
  }, [data.search, notifications.toasts, sort, pagination]);

  useEffect(() => {
    asyncSearch();
  }, [asyncSearch]);

  const useFetchAlertsData = () => {
    return {
      activePage: pagination.pageIndex,
      alerts,
      alertsCount,
      isInitializing,
      isLoading,
      getInspectQuery: () => ({ request: {}, response: {} }),
      onColumnsChange: (columns: EuiDataGridControlColumn[]) => {},
      onPageChange,
      onSortChange,
      refresh: () => {
        asyncSearch();
      },
    };
  };

  const tableProps = {
    consumers,
    bulkActions: [],
    columns: [
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
    ],
    deletedEventIds: [],
    disabledCellActions: [],
    pageSize: defaultPagination.pageSize,
    pageSizeOptions: [2, 5, 10, 20, 50, 100],
    leadingControlColumns: [],
    renderCellValue: (rcvProps: EuiDataGridCellValueElementProps) => {
      const { columnId, visibleRowIndex } = rcvProps as EuiDataGridCellValueElementProps & {
        visibleRowIndex: number;
      };
      const value = (get(alerts[visibleRowIndex], columnId) ?? [])[0];
      return value ?? 'N/A';
    },
    showCheckboxes,
    trailingControlColumns: [],
    useFetchAlertsData,
    'data-test-subj': 'internalAlertsPage',
  };

  return (
    <section>
      <h1>THIS IS AN INTERNAL TEST PAGE</h1>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>
          {isLoading && (
            <EuiProgress size="xs" color="accent" data-test-subj="internalAlertsPageLoading" />
          )}
          <AlertsTable {...tableProps} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </section>
  );
};

export { AlertsPage };
