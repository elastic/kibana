/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import uuid from 'uuid';
import { useAnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { SearchBar } from '../../shared/search_bar';
import { ServiceList } from './service_list';
import { MLCallout, shouldDisplayMlCallout } from '../../shared/ml_callout';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { apmServiceInventoryOptimizedSorting } from '../../../../../observability/common';
import { ServiceInventoryFieldName } from '../../../../common/service_inventory';
import { orderServiceItems } from './service_list/order_service_items';

const initialData = {
  requestId: '',
  items: [],
  hasHistoricalData: true,
  hasLegacyData: false,
};

function useServicesFetcher() {
  const {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      serviceGroup,
      offset,
      comparisonEnabled,
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

  const mainStatisticsFetch = useFetcher(
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
            requestId: uuid(),
            ...mainStatisticsData,
          };
        });
      }
    },
    [environment, kuery, start, end, serviceGroup]
  );

  const { data: mainStatisticsData = initialData } = mainStatisticsFetch;

  const comparisonFetch = useFetcher(
    (callApmApi) => {
      if (start && end && mainStatisticsData.items.length) {
        return callApmApi('GET /internal/apm/services/detailed_statistics', {
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
              serviceNames: JSON.stringify(
                mainStatisticsData.items
                  .map(({ serviceName }) => serviceName)
                  // Service name is sorted to guarantee the same order every time this API is called so the result can be cached.
                  .sort()
              ),
              offset: comparisonEnabled ? offset : undefined,
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

  return {
    sortedAndFilteredServicesFetch,
    mainStatisticsFetch,
    comparisonFetch,
  };
}

export function ServiceInventory() {
  const {
    sortedAndFilteredServicesFetch,
    mainStatisticsFetch,
    comparisonFetch,
  } = useServicesFetcher();

  const { anomalyDetectionSetupState } = useAnomalyDetectionJobsContext();

  const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
    `apm.userHasDismissedServiceInventoryMlCallout.${anomalyDetectionSetupState}`,
    false
  );

  const displayMlCallout =
    !userHasDismissedCallout &&
    shouldDisplayMlCallout(anomalyDetectionSetupState);

  const useOptimizedSorting = useKibana().services.uiSettings?.get<boolean>(
    apmServiceInventoryOptimizedSorting
  );

  let isLoading: boolean;

  if (useOptimizedSorting) {
    isLoading =
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

  const mainStatisticsItems = mainStatisticsFetch.data?.items ?? [];
  const preloadedServices = sortedAndFilteredServicesFetch.data?.services || [];

  const displayHealthStatus = [
    ...mainStatisticsItems,
    ...preloadedServices,
  ].some((item) => 'healthStatus' in item);

  const tiebreakerField = useOptimizedSorting
    ? ServiceInventoryFieldName.ServiceName
    : ServiceInventoryFieldName.Throughput;

  const initialSortField = displayHealthStatus
    ? ServiceInventoryFieldName.HealthStatus
    : tiebreakerField;

  const initialSortDirection =
    initialSortField === ServiceInventoryFieldName.ServiceName ? 'asc' : 'desc';

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

  return (
    <>
      <SearchBar showTimeComparison />
      <EuiFlexGroup direction="column" gutterSize="m">
        {displayMlCallout && (
          <EuiFlexItem>
            <MLCallout
              isOnSettingsPage={false}
              anomalyDetectionSetupState={anomalyDetectionSetupState}
              onDismiss={() => setUserHasDismissedCallout(true)}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <ServiceList
            isLoading={isLoading}
            isFailure={isFailure}
            items={items}
            comparisonDataLoading={
              comparisonFetch.status === FETCH_STATUS.LOADING ||
              comparisonFetch.status === FETCH_STATUS.NOT_INITIATED
            }
            displayHealthStatus={displayHealthStatus}
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
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
