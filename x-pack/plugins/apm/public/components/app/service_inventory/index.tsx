/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { useStateDebounced } from '../../../hooks/use_debounce';
import { ApmDocumentType } from '../../../../common/document_type';
import {
  ServiceInventoryFieldName,
  ServiceListItem,
} from '../../../../common/service_inventory';
import { useAnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, isPending } from '../../../hooks/use_fetcher';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { usePreferredDataSourceAndBucketSize } from '../../../hooks/use_preferred_data_source_and_bucket_size';
import { useProgressiveFetcher } from '../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { MLCallout, shouldDisplayMlCallout } from '../../shared/ml_callout';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { isTimeComparison } from '../../shared/time_comparison/get_comparison_options';
import { ServiceList } from './service_list';
import { orderServiceItems } from './service_list/order_service_items';
import { SortFunction } from '../../shared/managed_table';

const INITIAL_PAGE_SIZE = 25;

function useServicesMainStatisticsFetcher(searchQuery: string | undefined) {
  const {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      serviceGroup,
      page = 0,
      pageSize = INITIAL_PAGE_SIZE,
      sortDirection,
      sortField,
    },
  } = useApmParams('/services');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    type: ApmDocumentType.ServiceTransactionMetric,
    numBuckets: 20,
  });

  const shouldUseDurationSummary = !!preferred?.source?.hasDurationSummaryField;

  const mainStatisticsFetch = useProgressiveFetcher(
    (callApmApi) => {
      if (preferred) {
        return callApmApi('GET /internal/apm/services', {
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
              serviceGroup,
              useDurationSummary: shouldUseDurationSummary,
              documentType: preferred.source.documentType,
              rollupInterval: preferred.source.rollupInterval,
              searchQuery,
            },
          },
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      environment,
      kuery,
      start,
      end,
      serviceGroup,
      preferred,
      searchQuery,

      // not used, but needed to update the requestId to call the details statistics API when table options are updated
      page,
      pageSize,
      sortField,
      sortDirection,
    ]
  );

  return {
    mainStatisticsFetch,
  };
}

function useServicesDetailedStatisticsFetcher({
  currentPageItems,
}: {
  currentPageItems: ServiceListItem[];
}) {
  const {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      offset,
      comparisonEnabled,
    },
  } = useApmParams('/services');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const dataSourceOptions = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    type: ApmDocumentType.ServiceTransactionMetric,
    numBuckets: 20,
  });

  const comparisonFetch = useProgressiveFetcher(
    (callApmApi) => {
      if (start && end && currentPageItems.length > 0 && dataSourceOptions) {
        return callApmApi('POST /internal/apm/services/detailed_statistics', {
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
              offset:
                comparisonEnabled && isTimeComparison(offset)
                  ? offset
                  : undefined,
              documentType: dataSourceOptions.source.documentType,
              rollupInterval: dataSourceOptions.source.rollupInterval,
              bucketSizeInSeconds: dataSourceOptions.bucketSizeInSeconds,
            },
            body: {
              serviceNames: JSON.stringify(
                currentPageItems
                  .map(({ serviceName }) => serviceName)
                  // Service name is sorted to guarantee the same order every time this API is called so the result can be cached.
                  .sort()
              ),
            },
          },
        });
      }
    },
    // only fetches detailed statistics when requestId is invalidated by main statistics api call or offset is changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPageItems, offset, comparisonEnabled],
    { preservePreviousData: false }
  );

  return { comparisonFetch };
}

export function ServiceInventory() {
  const [currentPage, setCurrentPage] = useState<{
    items: ServiceListItem[];
    totalCount: number;
  }>({ items: [], totalCount: 0 });

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useStateDebounced(
    '',
    200
  );

  const { mainStatisticsFetch } =
    useServicesMainStatisticsFetcher(debouncedSearchQuery);

  const mainStatisticsItems = mainStatisticsFetch.data?.items ?? [];

  const displayHealthStatus = mainStatisticsItems.some(
    (item) => 'healthStatus' in item
  );

  const serviceOverflowCount =
    mainStatisticsFetch.data?.serviceOverflowCount ?? 0;

  const displayAlerts = mainStatisticsItems.some(
    (item) => ServiceInventoryFieldName.AlertsCount in item
  );

  const tiebreakerField = ServiceInventoryFieldName.Throughput;

  const initialSortField = displayHealthStatus
    ? ServiceInventoryFieldName.HealthStatus
    : tiebreakerField;

  const initialSortDirection = 'desc';

  const { comparisonFetch } = useServicesDetailedStatisticsFetcher({
    currentPageItems: currentPage.items,
  });

  const { anomalyDetectionSetupState } = useAnomalyDetectionJobsContext();

  const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
    `apm.userHasDismissedServiceInventoryMlCallout.${anomalyDetectionSetupState}`,
    false
  );

  const displayMlCallout =
    !userHasDismissedCallout &&
    shouldDisplayMlCallout(anomalyDetectionSetupState);

  const isLoading = isPending(mainStatisticsFetch.status);

  const isFailure = mainStatisticsFetch.status === FETCH_STATUS.FAILURE;
  const noItemsMessage = useMemo(() => {
    return (
      <EuiEmptyPrompt
        title={
          <div>
            {i18n.translate('xpack.apm.servicesTable.notFoundLabel', {
              defaultMessage: 'No services found',
            })}
          </div>
        }
        titleSize="s"
      />
    );
  }, []);

  const mlCallout = (
    <EuiFlexItem>
      <MLCallout
        isOnSettingsPage={false}
        anomalyDetectionSetupState={anomalyDetectionSetupState}
        onDismiss={() => setUserHasDismissedCallout(true)}
      />
    </EuiFlexItem>
  );

  const handleSort: SortFunction<ServiceListItem> = useCallback(
    (itemsToSort, sortField, sortDirection) => {
      return orderServiceItems({
        items: itemsToSort,
        primarySortField: sortField,
        sortDirection,
        tiebreakerField,
      });
    },
    [tiebreakerField]
  );

  return (
    <>
      <SearchBar showTimeComparison />
      <EuiFlexGroup direction="column" gutterSize="m">
        {displayMlCallout && mlCallout}
        <EuiFlexItem>
          <ServiceList
            isLoading={isLoading}
            isFailure={isFailure}
            items={mainStatisticsItems}
            comparisonDataLoading={
              comparisonFetch.status === FETCH_STATUS.LOADING
            }
            displayHealthStatus={displayHealthStatus}
            displayAlerts={displayAlerts}
            initialSortField={initialSortField}
            initialSortDirection={initialSortDirection}
            sortFn={handleSort}
            comparisonData={comparisonFetch?.data}
            noItemsMessage={noItemsMessage}
            initialPageSize={INITIAL_PAGE_SIZE}
            serviceOverflowCount={serviceOverflowCount}
            onChangeSearchQuery={setDebouncedSearchQuery}
            isSearchSideSearchQueryActive={
              mainStatisticsFetch.data?.isSearchSideSearchQueryActive ?? false
            }
            maxCountExceeded={
              mainStatisticsFetch.data?.maxCountExceeded ?? false
            }
            onChangeCurrentPage={setCurrentPage}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
