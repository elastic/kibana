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
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ApmDocumentType } from '../../../../common/document_type';
import { ServiceInventoryFieldName } from '../../../../common/service_inventory';
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

  const dataSourceOptions = usePreferredDataSourceAndBucketSize({
    rangeFrom,
    rangeTo,
    kuery,
    type: ApmDocumentType.ServiceTransactionMetric,
    numBuckets: 20,
  });

  const mainStatisticsFetch = useProgressiveFetcher(
    (callApmApi) => {
      if (start && end && dataSourceOptions) {
        return callApmApi('GET /internal/apm/services', {
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
              serviceGroup,
              documentType: dataSourceOptions.source.documentType,
              rollupInterval: dataSourceOptions.source.rollupInterval,
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
      dataSourceOptions?.source.documentType,
      dataSourceOptions?.source.rollupInterval,
      // not used, but needed to update the requestId to call the details statistics API when table is options are updated
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

  const dataSourceOptions = usePreferredDataSourceAndBucketSize({
    rangeFrom,
    rangeTo,
    kuery,
    type: ApmDocumentType.ServiceTransactionMetric,
    numBuckets: 20,
  });

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
        mainStatisticsFetch.status === FETCH_STATUS.SUCCESS &&
        dataSourceOptions
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
    [mainStatisticsData.requestId, offset, comparisonEnabled],
    { preservePreviousData: false }
  );

  return { comparisonFetch };
}

export function ServiceInventory() {
  const { mainStatisticsFetch } = useServicesMainStatisticsFetcher();

  const mainStatisticsItems = mainStatisticsFetch.data?.items ?? [];

  const displayHealthStatus = mainStatisticsItems.some(
    (item) => 'healthStatus' in item
  );

  const hasKibanaUiLimitRestrictedData =
    mainStatisticsFetch.data?.maxServiceCountExceeded;

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

  const isLoading = isPending(mainStatisticsFetch.status);

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

  const items = mainStatisticsItems;

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
