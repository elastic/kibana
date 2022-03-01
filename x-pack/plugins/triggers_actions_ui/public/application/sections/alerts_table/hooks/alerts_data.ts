/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect, useCallback } from 'react';
import { EuiDataGridControlColumn } from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';
import { AlertConsumers } from '@kbn/rule-data-utils';
import {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
  RuleRegistrySearchRequestSort,
  RuleRegistrySearchRequestPagination,
} from '../../../../../../rule_registry/common';
import { AbortError } from '../../../../../../../../src/plugins/kibana_utils/common';
import { useKibana } from '../../../../common/lib/kibana';

export interface UseFetchAlertsDataProps {
  consumers: AlertConsumers[];
}

interface AsyncSearchProps {
  sort?: RuleRegistrySearchRequestSort[];
  pagination?: RuleRegistrySearchRequestPagination;
}

export function useFetchAlertsData({ consumers }: UseFetchAlertsDataProps) {
  const { data, notifications } = useKibana().services;

  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [kuery] = useState<string>('');
  const [alerts, setAlerts] = useState({}); // Record<string, any
  const [alertsCount, setAlertsCount] = useState(0);
  const [activePage, setActivePage] = useState(0);

  const onColumnsChange = (columns: EuiDataGridControlColumn[]) => {};
  const onPageChange = (pagination: RuleRegistrySearchRequestPagination) => {
    setActivePage(pagination.pageIndex);
    asyncSearch({ pagination });
  };
  const onSortChange = (sort: RuleRegistrySearchRequestSort[]) => {
    asyncSearch({ sort });
  };

  const asyncSearch = useCallback(
    ({ sort, pagination }: AsyncSearchProps) => {
      setIsLoading(true);
      const abortController = new AbortController();
      const query = toElasticsearchQuery(fromKueryExpression(kuery));
      const request: RuleRegistrySearchRequest = {
        featureIds: consumers,
        sort,
        pagination,
      };
      if (query.bool) {
        request.query = { bool: query.bool };
      }
      data.search
        .search<RuleRegistrySearchRequest, RuleRegistrySearchResponse>(request, {
          strategy: 'ruleRegistryAlertsSearchStrategy',
          abortSignal: abortController.signal,
        })
        .subscribe({
          next: (res) => {
            // eslint-disable-next-line no-console
            console.log('response from search strategy', {
              isPartial: res.isPartial,
              isRunning: res.isRunning,
              res,
            });
            const alertsResponse = res.rawResponse.hits.hits.map((hit) => hit.fields);
            setAlerts(alertsResponse);
            const total = !isNaN(res.rawResponse.hits.total as number)
              ? (res.rawResponse.hits.total as number)
              : (res.rawResponse.hits.total as estypes.SearchTotalHits).value ?? 0;
            setAlertsCount(total);
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
      setIsLoading(false);
      setIsInitializing(false);
    },
    [data.search, kuery, notifications.toasts, consumers]
  );

  useEffect(() => {
    asyncSearch({});
  }, [asyncSearch]);

  return {
    activePage,
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
    alertsCount,
  };
}
