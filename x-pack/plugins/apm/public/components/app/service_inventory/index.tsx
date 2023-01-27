/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { apmServiceInventoryOptimizedSorting } from '@kbn/observability-plugin/common';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ServiceInventoryFieldName } from '../../../../common/service_inventory';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { useAnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { useProgressiveFetcher } from '../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { MLCallout, shouldDisplayMlCallout } from '../../shared/ml_callout';
import { SearchBar } from '../../shared/search_bar';
import { isTimeComparison } from '../../shared/time_comparison/get_comparison_options';
import { ServiceList } from './service_list';
import { orderServiceItems } from './service_list/order_service_items';

const initialData = {
  requestId: '',
  items: [],
  hasHistoricalData: true,
  hasLegacyData: false,
};

const INITIAL_PAGE_SIZE = 25;

function useServicesMainStatisticsFetcher() {
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

  const sortedAndFilteredServicesFetch = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/sorted_and_filtered_services', {
        params: {
          query: {
            start,
            end,
            environment,
            kuery,
            serviceGroup,
          },
        },
      });
    },
    [start, end, environment, kuery, serviceGroup]
  );

  const mainStatisticsFetch = useProgressiveFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi('GET /internal/apm/services', {
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
              serviceGroup,
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
      // not used, but needed to update the requestId to call the details statistics API when table is options are updated
      page,
      pageSize,
      sortField,
      sortDirection,
    ]
  );

  return {
    sortedAndFilteredServicesFetch,
    mainStatisticsFetch,
  };
}

function useServicesDetailedStatisticsFetcher({
  mainStatisticsFetch,
  initialSortField,
  initialSortDirection,
  tiebreakerField,
}: {
  mainStatisticsFetch: ReturnType<
    typeof useServicesMainStatisticsFetcher
  >['mainStatisticsFetch'];
  initialSortField: ServiceInventoryFieldName;
  initialSortDirection: 'asc' | 'desc';
  tiebreakerField: ServiceInventoryFieldName;
}) {
  const {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      offset,
      comparisonEnabled,
      page = 0,
      pageSize = INITIAL_PAGE_SIZE,
      sortDirection = initialSortDirection,
      sortField = initialSortField,
    },
  } = useApmParams('/services');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data: mainStatisticsData = initialData } = mainStatisticsFetch;

  const currentPageItems = orderServiceItems({
    items: mainStatisticsData.items,
    primarySortField: sortField as ServiceInventoryFieldName,
    sortDirection,
    tiebreakerField,
  }).slice(page * pageSize, (page + 1) * pageSize);

  const comparisonFetch = useProgressiveFetcher(
    (callApmApi) => {
      if (
        start &&
        end &&
        currentPageItems.length &&
        mainStatisticsFetch.status === FETCH_STATUS.SUCCESS
      ) {
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
    [mainStatisticsData.requestId, offset, comparisonEnabled],
    { preservePreviousData: false }
  );

  return { comparisonFetch };
}

export function ServiceInventory() {
  const { sortedAndFilteredServicesFetch, mainStatisticsFetch } =
    useServicesMainStatisticsFetcher();

  const mainStatisticsItems = mainStatisticsFetch.data?.items ?? [];
  const preloadedServices = sortedAndFilteredServicesFetch.data?.services || [];

  const displayHealthStatus = [
    ...mainStatisticsItems,
    ...preloadedServices,
  ].some((item) => 'healthStatus' in item);

  const hasKibanaUiLimitRestrictedData =
    mainStatisticsFetch.data?.maxServiceCountExceeded;

  const serviceOverflowCount =
    mainStatisticsFetch.data?.serviceOverflowCount ?? 0;

  const displayAlerts = [...mainStatisticsItems, ...preloadedServices].some(
    (item) => ServiceInventoryFieldName.AlertsCount in item
  );

  const useOptimizedSorting =
    useKibana().services.uiSettings?.get<boolean>(
      apmServiceInventoryOptimizedSorting
    ) || false;

  const tiebreakerField = useOptimizedSorting
    ? ServiceInventoryFieldName.ServiceName
    : ServiceInventoryFieldName.Throughput;

  const initialSortField = displayHealthStatus
    ? ServiceInventoryFieldName.HealthStatus
    : tiebreakerField;

  const initialSortDirection =
    initialSortField === ServiceInventoryFieldName.ServiceName ? 'asc' : 'desc';

  const { comparisonFetch } = useServicesDetailedStatisticsFetcher({
    mainStatisticsFetch,
    initialSortField,
    initialSortDirection,
    tiebreakerField,
  });

  const { anomalyDetectionSetupState } = useAnomalyDetectionJobsContext();

  const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
    `apm.userHasDismissedServiceInventoryMlCallout.${anomalyDetectionSetupState}`,
    false
  );

  const displayMlCallout =
    !userHasDismissedCallout &&
    shouldDisplayMlCallout(anomalyDetectionSetupState);

  let isLoading: boolean;

  if (useOptimizedSorting) {
    isLoading =
      // ensures table is usable when sorted and filtered services have loaded
      sortedAndFilteredServicesFetch.status === FETCH_STATUS.LOADING ||
      (sortedAndFilteredServicesFetch.status === FETCH_STATUS.SUCCESS &&
        sortedAndFilteredServicesFetch.data?.services.length === 0 &&
        mainStatisticsFetch.status === FETCH_STATUS.LOADING);
  } else {
    isLoading = mainStatisticsFetch.status === FETCH_STATUS.LOADING;
  }

  const isFailure = mainStatisticsFetch.status === FETCH_STATUS.FAILURE;
  const noItemsMessage = (
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

  const items = joinByKey(
    [
      // only use preloaded services if tiebreaker field is service.name,
      // otherwise ignore them to prevent re-sorting of the table
      // once the tiebreaking metric comes in
      ...(tiebreakerField === ServiceInventoryFieldName.ServiceName
        ? preloadedServices
        : []),
      ...mainStatisticsItems,
    ],
    'serviceName'
  );

  const mlCallout = (
    <EuiFlexItem>
      <MLCallout
        isOnSettingsPage={false}
        anomalyDetectionSetupState={anomalyDetectionSetupState}
        onDismiss={() => setUserHasDismissedCallout(true)}
      />
    </EuiFlexItem>
  );

  const kibanaUiServiceLimitCallout = (
    <EuiFlexItem>
      <EuiCallOut
        title={i18n.translate(
          'xpack.apm.serviceList.ui.limit.warning.calloutTitle',
          {
            defaultMessage:
              'Number of services exceed the allowed maximum that are displayed (1,000)',
          }
        )}
        color="warning"
        iconType="alert"
      >
        <EuiText size="s">
          <FormattedMessage
            defaultMessage="Max. number of services that can be viewed in Kibana has been reached. Try narrowing down results by using the query bar or consider using service groups."
            id="xpack.apm.serviceList.ui.limit.warning.calloutDescription"
          />
        </EuiText>
      </EuiCallOut>
    </EuiFlexItem>
  );

  return (
    <>
      <SearchBar showTimeComparison />
      <EuiFlexGroup direction="column" gutterSize="m">
        {displayMlCallout && mlCallout}
        {hasKibanaUiLimitRestrictedData && kibanaUiServiceLimitCallout}
        <EuiFlexItem>
          <ServiceList
            isLoading={isLoading}
            isFailure={isFailure}
            items={items}
            comparisonDataLoading={
              comparisonFetch.status === FETCH_STATUS.LOADING
            }
            displayHealthStatus={displayHealthStatus}
            displayAlerts={displayAlerts}
            initialSortField={initialSortField}
            initialSortDirection={initialSortDirection}
            sortFn={(itemsToSort, sortField, sortDirection) => {
              return orderServiceItems({
                items: itemsToSort,
                primarySortField: sortField,
                sortDirection,
                tiebreakerField,
              });
            }}
            comparisonData={comparisonFetch?.data}
            noItemsMessage={noItemsMessage}
            initialPageSize={INITIAL_PAGE_SIZE}
            serviceOverflowCount={serviceOverflowCount}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
