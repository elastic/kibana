/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ApmDocumentType } from '../../../../common/document_type';
import type { ServiceListItem } from '../../../../common/service_inventory';
import { ServiceInventoryFieldName } from '../../../../common/service_inventory';
import { useAnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useStateDebounced } from '../../../hooks/use_debounce';
import { FETCH_STATUS, isFailure, isPending } from '../../../hooks/use_fetcher';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { usePreferredDataSourceAndBucketSize } from '../../../hooks/use_preferred_data_source_and_bucket_size';
import { useProgressiveFetcher } from '../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import type { SortFunction } from '../../shared/managed_table';
import { MLCallout, shouldDisplayMlCallout } from '../../shared/ml_callout';
import { SearchBar } from '../../shared/search_bar/search_bar';
import { isTimeComparison } from '../../shared/time_comparison/get_comparison_options';
import { ApmServicesTable } from './service_list/apm_services_table';
import { orderServiceItems } from './service_list/order_service_items';

type MainStatisticsApiResponse = APIReturnType<'GET /internal/apm/services'>;

const INITIAL_PAGE_SIZE = 25;
const INITIAL_DATA: MainStatisticsApiResponse & { requestId: string } = {
  requestId: '',
  items: [],
  serviceOverflowCount: 0,
  maxCountExceeded: false,
};

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

  const { data = INITIAL_DATA, status } = useProgressiveFetcher(
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
        }).then((mainStatisticsData) => {
          return {
            requestId: uuidv4(),
            ...mainStatisticsData,
          };
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

  return { mainStatisticsData: data, mainStatisticsStatus: status };
}

function useServicesDetailedStatisticsFetcher({
  mainStatisticsFetch,
  renderedItems,
}: {
  mainStatisticsFetch: ReturnType<typeof useServicesMainStatisticsFetcher>;
  renderedItems: ServiceListItem[];
}) {
  const {
    query: { rangeFrom, rangeTo, environment, kuery, offset, comparisonEnabled },
  } = useApmParams('/services');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const dataSourceOptions = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    type: ApmDocumentType.ServiceTransactionMetric,
    numBuckets: 20,
  });

  const { mainStatisticsData, mainStatisticsStatus } = mainStatisticsFetch;

  const comparisonFetch = useProgressiveFetcher(
    (callApmApi) => {
      const serviceNames = renderedItems.map(({ serviceName }) => serviceName);

      if (
        start &&
        end &&
        serviceNames.length > 0 &&
        mainStatisticsStatus === FETCH_STATUS.SUCCESS &&
        dataSourceOptions
      ) {
        return callApmApi('POST /internal/apm/services/detailed_statistics', {
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
              documentType: dataSourceOptions.source.documentType,
              rollupInterval: dataSourceOptions.source.rollupInterval,
              bucketSizeInSeconds: dataSourceOptions.bucketSizeInSeconds,
            },
            body: {
              // Service name is sorted to guarantee the same order every time this API is called so the result can be cached.
              serviceNames: JSON.stringify(serviceNames.sort()),
            },
          },
        });
      }
    },
    // only fetches detailed statistics when requestId is invalidated by main statistics api call or offset is changed

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mainStatisticsData.requestId, renderedItems, offset, comparisonEnabled],
    { preservePreviousData: false }
  );

  return { comparisonFetch };
}

export function ServiceInventory() {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useStateDebounced('');
  const { onPageReady } = usePerformanceContext();
  const [renderedItems, setRenderedItems] = useState<ServiceListItem[]>([]);
  const mainStatisticsFetch = useServicesMainStatisticsFetcher(debouncedSearchQuery);
  const { mainStatisticsData, mainStatisticsStatus } = mainStatisticsFetch;
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services');

  const displayHealthStatus = mainStatisticsData.items.some((item) => 'healthStatus' in item);

  const serviceOverflowCount = mainStatisticsData?.serviceOverflowCount ?? 0;

  const displayAlerts = mainStatisticsData.items.some(
    (item) => ServiceInventoryFieldName.AlertsCount in item
  );

  const tiebreakerField = ServiceInventoryFieldName.Throughput;

  const initialSortField = displayHealthStatus
    ? ServiceInventoryFieldName.HealthStatus
    : tiebreakerField;

  const initialSortDirection = 'desc';

  const { comparisonFetch } = useServicesDetailedStatisticsFetcher({
    mainStatisticsFetch,
    renderedItems,
  });

  const { anomalyDetectionSetupState } = useAnomalyDetectionJobsContext();

  const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
    `apm.userHasDismissedServiceInventoryMlCallout.${anomalyDetectionSetupState}`,
    false
  );

  const displayMlCallout =
    !userHasDismissedCallout && shouldDisplayMlCallout(anomalyDetectionSetupState);

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

  const sortFn: SortFunction<ServiceListItem> = useCallback(
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

  // TODO verify this with AI team
  const setScreenContext = useApmPluginContext().observabilityAIAssistant?.service.setScreenContext;

  useEffect(() => {
    if (!setScreenContext) {
      return;
    }

    if (isFailure(mainStatisticsStatus)) {
      return setScreenContext({
        screenDescription: 'The services have failed to load',
      });
    }

    if (isPending(mainStatisticsStatus)) {
      return setScreenContext({
        screenDescription: 'The services are still loading',
      });
    }

    return setScreenContext({
      data: [
        {
          name: 'services',
          description: 'The list of services that the user is looking at',
          value: mainStatisticsData.items,
        },
      ],
    });
  }, [mainStatisticsStatus, mainStatisticsData.items, setScreenContext]);

  useEffect(() => {
    if (
      mainStatisticsStatus === FETCH_STATUS.SUCCESS &&
      comparisonFetch.status === FETCH_STATUS.SUCCESS
    ) {
      onPageReady({
        meta: { rangeFrom, rangeTo },
      });
    }
  }, [mainStatisticsStatus, comparisonFetch.status, onPageReady, rangeFrom, rangeTo]);

  return (
    <>
      <SearchBar showTimeComparison />
      <EuiFlexGroup direction="column" gutterSize="m">
        {displayMlCallout && mlCallout}
        <EuiFlexItem>
          <ApmServicesTable
            status={mainStatisticsStatus}
            items={mainStatisticsData.items}
            comparisonDataLoading={comparisonFetch.status === FETCH_STATUS.LOADING}
            displayHealthStatus={displayHealthStatus}
            displayAlerts={displayAlerts}
            initialSortField={initialSortField}
            initialSortDirection={initialSortDirection}
            sortFn={sortFn}
            comparisonData={comparisonFetch?.data}
            noItemsMessage={noItemsMessage}
            initialPageSize={INITIAL_PAGE_SIZE}
            serviceOverflowCount={serviceOverflowCount}
            onChangeSearchQuery={setDebouncedSearchQuery}
            maxCountExceeded={mainStatisticsData?.maxCountExceeded ?? false}
            onChangeRenderedItems={setRenderedItems}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
