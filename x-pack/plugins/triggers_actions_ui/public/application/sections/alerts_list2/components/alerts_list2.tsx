/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { DataViewBase } from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { get } from 'lodash';
import { EuiDataGrid, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { AbortError } from '../../../../../../../../src/plugins/kibana_utils/common';
import {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
  ParsedTechnicalFields,
  BASE_RAC_ALERTS_API_PATH,
} from '../../../../../../rule_registry/common';
import { useKibana } from '../../../../common/lib/kibana';
import { Consumer } from '../types';
import { QueryBar } from './query_bar';
import { useStateContainer } from './state/use_state_container';
import { Provider, alertsPageStateContainer } from './state/state_container';

const AlertsListUI: React.FunctionComponent = () => {
  const {
    http,
    data,
    notifications,
    application: { capabilities },
    kibanaFeatures,
  } = useKibana().services;

  const timefilterService = data.query.timefilter.timefilter;
  const visibleConsumers: Consumer[] = Object.values(AlertConsumers)
    .filter((consumer) => {
      return capabilities[consumer]?.show;
    })
    .map((consumer) => {
      const feature = kibanaFeatures.find((kibanaFeature) => kibanaFeature.id === consumer);
      return { id: consumer, name: feature?.name } as Consumer;
    });

  const [alerts, setAlerts] = useState<ParsedTechnicalFields[]>([]);
  const [alertsTotal, setAlertsTotal] = useState<number>(0);
  const [dynamicIndexPatterns, setDynamicIndexPatterns] = useState<DataViewBase[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sortingColumns, setSortingColumns] = useState([]);

  const { rangeFrom, setRangeFrom, rangeTo, setRangeTo, kuery, setKuery } = useStateContainer();

  const streamData = useCallback(() => {
    const abortController = new AbortController();
    const request: RuleRegistrySearchRequest = {
      featureIds: visibleConsumers.map((c) => c.id),
      query: kuery,
    };

    data.search
      .search<RuleRegistrySearchRequest, RuleRegistrySearchResponse>(request, {
        strategy: 'ruleRegistrySearchStrategy',
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
          const alertsResponse = res.rawResponse.hits.hits.map((hit) => hit._source!);
          setAlerts(alertsResponse);
          const total = !isNaN(res.rawResponse.hits.total as number)
            ? (res.rawResponse.hits.total as number)
            : (res.rawResponse.hits.total as estypes.SearchTotalHits).value ?? 0;
          setAlertsTotal(total);
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
  }, [data.search, notifications.toasts, visibleConsumers, kuery]);

  const fetchIndicesForQueryBar = useCallback(async () => {
    const { index_name: indexNames } = await http.get<{ index_name: string[] }>(
      `${BASE_RAC_ALERTS_API_PATH}/index`,
      {
        query: { features: visibleConsumers.map(({ id }) => id).join(',') },
      }
    );
    setDynamicIndexPatterns([
      {
        id: 'dynamic-observability-alerts-table-index-pattern',
        title: indexNames.join(','),
        fields: await data.dataViews.getFieldsForWildcard({
          pattern: indexNames.join(','),
          allowNoIndex: true,
        }),
      },
    ]);
  }, [visibleConsumers, http, data.dataViews]);

  const onQueryBarQueryChange = useCallback(
    ({ dateRange, query }) => {
      if (rangeFrom === dateRange.from && rangeTo === dateRange.to && kuery === (query ?? '')) {
        streamData();
        return;
        // return refetch.current && refetch.current();
      }
      timefilterService.setTime(dateRange);
      setRangeFrom(dateRange.from);
      setRangeTo(dateRange.to);
      setKuery(query);
      // syncAlertStatusFilterStatus(query as string);
    },
    [rangeFrom, setRangeFrom, rangeTo, setRangeTo, kuery, setKuery, timefilterService, streamData]
  );

  useEffect(() => {
    streamData();
    fetchIndicesForQueryBar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const onChangeItemsPerPage = useCallback(
    (pageSize) =>
      setPagination((_state) => ({
        ..._state,
        pageSize,
        pageIndex: 0,
      })),
    [setPagination]
  );
  const onChangePage = useCallback(
    (pageIndex) => setPagination((_state) => ({ ..._state, pageIndex })),
    [setPagination]
  );
  const onSort = useCallback(
    (_state) => {
      setSortingColumns(_state);
    },
    [setSortingColumns]
  );

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(
    columns.map(({ id }) => id) // initialize to the full set of columns
  );

  const RenderCellValue = ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
    const row = alerts[rowIndex];
    return get(row, columnId) ?? 'N/A';
  };

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={true}>
          <QueryBar
            dynamicIndexPatterns={dynamicIndexPatterns}
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
        // trailingControlColumns={trailingControlColumns}
        rowCount={alertsTotal}
        renderCellValue={RenderCellValue}
        // inMemory={{ level: 'sorting' }}
        sorting={{ columns: sortingColumns, onSort }}
        pagination={{
          ...pagination,
          pageSizeOptions: [10, 50, 100],
          onChangeItemsPerPage,
          onChangePage,
        }}
        // onColumnResize={onColumnResize.current}
      />
    </>
  );
};

export function AlertsList() {
  return (
    <Provider value={alertsPageStateContainer}>
      <AlertsListUI />
    </Provider>
  );
}

// eslint-disable-next-line import/no-default-export
export { AlertsList as default };
