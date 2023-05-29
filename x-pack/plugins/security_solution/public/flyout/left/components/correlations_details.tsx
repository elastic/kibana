/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo, useReducer, useCallback } from 'react';
import {
  type Criteria,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  formatDate,
} from '@elastic/eui';
import { useQuery } from '@tanstack/react-query';
import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/public';
import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SearchHit } from '@kbn/es-types';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { useSourcererDataView } from '../../../common/containers/sourcerer';

import { useCorrelations } from '../../right/hooks/use_correlations';
import { useLeftPanelContext } from '../context';
import { useRouteSpy } from '../../../common/utils/route/use_route_spy';
import { SecurityPageName } from '../../../../common';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { EntityPanel } from '../../right/components/entity_panel';
import { useKibana } from '../../../common/lib/kibana';

interface AlertsTableProps {
  alertIds: string[];
}

export const TIMESTAMP_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

const columns = [
  {
    field: '@timestamp',
    name: 'Timestamp',
    truncateText: true,
    dataType: 'date',
    render: (value: string) => formatDate(value, TIMESTAMP_DATE_FORMAT),
  },
  {
    field: 'kibana.alert.rule.name',
    name: 'Rule',
    truncateText: true,
  },
  {
    field: 'kibana.alert.reason',
    name: 'Reason',
    truncateText: true,
  },
  {
    field: 'kibana.alert.severity',
    name: 'Severity',
    truncateText: true,
  },
];

export interface UseAlertsQueryParams {
  alertIds: string[];
  from: number;
  size: number;
  sort?: Array<Record<string, 'asc' | 'desc'>>;
}

export interface UseAlertsQueryResult {
  error: boolean;
  loading: boolean;
  totalItemCount: number;
  // TODO: fix this type
  data: any;
}

/**
 * Returns the number of cases related to a document id (and the loading, error statuses as well as the cases count)
 */
export const useFetchAlerts = ({
  alertIds,
  from,
  size,
  sort,
}: UseAlertsQueryParams): UseAlertsQueryResult => {
  const QUERY_KEY = `useFetchAlerts`;

  const {
    services: { data: dataService },
  } = useKibana();

  const { data, isLoading, isError } = useQuery<
    SearchResponse<SearchHit, Record<string, AggregationsAggregate>>,
    unknown
  >(
    [QUERY_KEY, alertIds, from, size, sort],
    async ({ signal }) => {
      return new Promise((resolve, reject) => {
        const $subscription = dataService.search
          .search(
            {
              params: {
                body: {
                  query: {
                    ids: { values: alertIds },
                  },
                  from,
                  size,
                  sort,
                  fields: ['*'],
                  _source: false,
                },
              },
            },
            { abortSignal: signal }
          )
          .subscribe((response) => {
            if (isCompleteResponse(response)) {
              $subscription.unsubscribe();
              resolve(response.rawResponse);
            } else if (isErrorResponse(response)) {
              $subscription.unsubscribe();
              reject(new Error(`Error while loading alerts`));
            }
          });
      });
    },
    {
      keepPreviousData: true,
    }
  );

  return useMemo(
    () => ({
      loading: isLoading,
      error: isError,
      data: data?.hits?.hits || [],
      totalItemCount: (data?.hits?.total as number) || 0,
    }),
    [data, isError, isLoading]
  );
};

interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

const initialPagination: PaginationState = { pageIndex: 0, pageSize: 5 };

const paginationReducer = (state: PaginationState, action: PaginationState): PaginationState => {
  return action;
};

interface SortingState {
  enableAllColumns: boolean;
  sort: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

const initialSorting: SortingState = {
  sort: {
    field: '@timestamp',
    direction: 'desc',
  },
  enableAllColumns: true,
};

const sortingReducer = (state: SortingState, action: SortingState['sort']): SortingState => {
  return {
    ...state,
    sort: action,
  };
};

const AlertsTable: FC<AlertsTableProps> = ({ alertIds }) => {
  const [sorting, setSorting] = useReducer(sortingReducer, initialSorting);
  const [pagination, setPagination] = useReducer(paginationReducer, initialPagination);

  const sortConfig = useMemo(() => {
    return [
      {
        [sorting.sort.field]: sorting.sort.direction,
      },
    ];
  }, [sorting.sort.direction, sorting.sort.field]);

  const { data, totalItemCount, loading, error } = useFetchAlerts({
    alertIds,
    from: pagination.pageIndex * pagination.pageSize,
    size: pagination.pageSize,
    sort: sortConfig,
  });

  const paginationConfig = useMemo(
    () => ({
      ...pagination,
      totalItemCount,
      pageSizeOptions: [3, 5, 8],
    }),
    [pagination, totalItemCount]
  );

  const onTableChange = useCallback(({ page, sort }: Criteria<Record<string, unknown>>) => {
    if (page) {
      const { index: pageIndex, size: pageSize } = page;
      setPagination({ pageIndex, pageSize });
    }

    if (sort) {
      setSorting(sort);
    }
  }, []);

  const mappedData = useMemo(() => {
    return data
      .map((hit) => hit.fields)
      .map((fields = {}) =>
        Object.keys(fields).reduce((result, fieldName) => {
          result[fieldName] = fields?.[fieldName]?.[0] || fields?.[fieldName];
          return result;
        }, {} as Record<string, unknown>)
      );
  }, [data]);

  return (
    <EuiBasicTable
      loading={loading}
      tableCaption="Demo for EuiBasicTable with sorting"
      items={mappedData}
      columns={columns}
      pagination={paginationConfig}
      sorting={sorting}
      onChange={onTableChange}
    />
  );
};

export const CORRELATIONS_TAB_ID = 'correlations-details';

/**
 * Correlations displayed in the document details expandable flyout left section under the Insights tab
 */
export const CorrelationsDetails: React.FC = () => {
  const { indexName, eventId } = useLeftPanelContext();

  const scopeId = 'flyout'; // TODO: update to use context

  // TODO: move this to a separate hook
  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections
      ? SourcererScopeName.detections
      : SourcererScopeName.default;

  const sourcererDataView = useSourcererDataView(sourcererScope);

  const [isEventDataLoading, eventData, _searchHit, dataAsNestedObject] = useTimelineEventsDetails({
    indexName,
    eventId,
    runtimeMappings: sourcererDataView.runtimeMappings,
    skip: !eventId,
  });

  const {
    loading: isCorrelationsLoading,
    error: correlationsError,
    ancestryAlertsIds,
    alertsBySessionIds,
    sameSourceAlertsIds,
  } = useCorrelations({
    eventId,
    dataAsNestedObject,
    dataFormattedForFieldBrowser: eventData,
    scopeId,
  });

  // TODO: handle errors

  const topLevelLoading = isEventDataLoading || isCorrelationsLoading;

  if (topLevelLoading) {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      <EntityPanel
        title={`${ancestryAlertsIds.length} alerts related by ancestry`}
        iconType={'warning'}
        expandable={true}
        expanded={true}
      >
        <AlertsTable alertIds={ancestryAlertsIds} />
      </EntityPanel>

      <EuiSpacer />

      <EntityPanel
        title={`${sameSourceAlertsIds.length} alerts related by source event`}
        iconType={'warning'}
        expandable={true}
        expanded={true}
      >
        <AlertsTable alertIds={sameSourceAlertsIds} />
      </EntityPanel>

      <EuiSpacer />

      <EntityPanel
        title={`${alertsBySessionIds.length} alerts related by session`}
        iconType={'warning'}
        expandable={true}
        expanded={false}
      >
        <AlertsTable alertIds={alertsBySessionIds} />
      </EntityPanel>
    </>
  );
};

CorrelationsDetails.displayName = 'CorrelationsDetails';
