/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import uuid from 'uuid';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../../../src/core/public';
import { useAnomalyDetectionJobsContext } from '../../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { createCallApmApi } from '../../../../services/rest/createCallApmApi';
import { MLCallout, shouldDisplayMlCallout } from '../../../shared/ml_callout';
import { getTimeRangeComparison } from '../../../shared/time_comparison/get_time_range_comparison';
import { ServiceList } from './service_list';

export interface ServiceInventoryProps {
  comparisonEnabled?: boolean;
  comparisonType?: 'week' | 'day' | 'period';
  rangeFrom?: string;
  rangeTo?: string;
  environment?: string;
  kuery?: string;
}

const initialData = {
  requestId: '',
  mainStatisticsData: {
    items: [],
    hasHistoricalData: true,
    hasLegacyData: false,
  },
};

function useServicesFetcherExternal({
  comparisonEnabled,
  comparisonType,
  rangeFrom,
  rangeTo,
  environment,
  kuery,
}: ServiceInventoryProps) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { offset } = getTimeRangeComparison({
    start,
    end,
    comparisonEnabled,
    comparisonType,
  });

  const { data = initialData, status: mainStatisticsStatus } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /internal/apm/services',
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
            },
          },
        }).then((mainStatisticsData) => {
          return {
            requestId: uuid(),
            mainStatisticsData,
          };
        });
      }
    },
    [environment, kuery, start, end]
  );

  const { mainStatisticsData, requestId } = data;

  const { data: comparisonData } = useFetcher(
    (callApmApi) => {
      if (start && end && mainStatisticsData.items.length) {
        return callApmApi({
          endpoint: 'GET /internal/apm/services/detailed_statistics',
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
              offset,
            },
          },
        });
      }
    },
    // only fetches detailed statistics when requestId is invalidated by main statistics api call or offset is changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestId, offset],
    { preservePreviousData: false }
  );

  return {
    mainStatisticsData,
    mainStatisticsStatus,
    comparisonData,
  };
}

export function ServiceInventory({
  comparisonEnabled,
  comparisonType,
  rangeFrom,
  rangeTo,
  environment,
  kuery,
}: ServiceInventoryProps) {
  const { services } = useKibana();

  const serviceParams = {
    comparisonEnabled,
    comparisonType,
    rangeFrom,
    rangeTo,
    environment,
    kuery,
  };

  useEffect(() => {
    createCallApmApi(services as CoreStart);
  }, [services]);

  const { mainStatisticsData, mainStatisticsStatus, comparisonData } =
    useServicesFetcherExternal({
      comparisonEnabled,
      comparisonType,
      rangeFrom,
      rangeTo,
      environment,
      kuery,
    });

  const { anomalyDetectionSetupState } = useAnomalyDetectionJobsContext();

  const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
    `apm.userHasDismissedServiceInventoryMlCallout.${anomalyDetectionSetupState}`,
    false
  );

  const displayMlCallout =
    !userHasDismissedCallout &&
    shouldDisplayMlCallout(anomalyDetectionSetupState);

  const isLoading = mainStatisticsStatus === FETCH_STATUS.LOADING;
  const isFailure = mainStatisticsStatus === FETCH_STATUS.FAILURE;
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

  return (
    <>
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
            items={mainStatisticsData.items}
            comparisonData={comparisonData}
            noItemsMessage={noItemsMessage}
            serviceParams={serviceParams}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default ServiceInventory;
