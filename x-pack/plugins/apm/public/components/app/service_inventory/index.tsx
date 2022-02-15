/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import uuid from 'uuid';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { useAnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useUpgradeAssistantHref } from '../../shared/links/kibana';
import { SearchBar } from '../../shared/search_bar';
import { getTimeRangeComparison } from '../../shared/time_comparison/get_time_range_comparison';
import { ServiceList } from './service_list';
import { MLCallout, shouldDisplayMlCallout } from '../../shared/ml_callout';

const initialData = {
  requestId: '',
  mainStatisticsData: {
    items: [],
    hasHistoricalData: true,
    hasLegacyData: false,
  },
};

let hasDisplayedToast = false;

function useServicesFetcher() {
  const {
    urlParams: { comparisonEnabled, comparisonType },
  } = useLegacyUrlParams();

  const {
    query: { rangeFrom, rangeTo, environment, kuery },
  } = useAnyOfApmParams('/services/{serviceName}', '/services');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { core } = useApmPluginContext();
  const upgradeAssistantHref = useUpgradeAssistantHref();

  const { offset } = getTimeRangeComparison({
    start,
    end,
    comparisonEnabled,
    comparisonType,
  });

  const { data = initialData, status: mainStatisticsStatus } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi('GET /internal/apm/services', {
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

  useEffect(() => {
    if (mainStatisticsData.hasLegacyData && !hasDisplayedToast) {
      hasDisplayedToast = true;

      core.notifications.toasts.addWarning({
        title: i18n.translate('xpack.apm.serviceInventory.toastTitle', {
          defaultMessage:
            'Legacy data was detected within the selected time range',
        }),
        text: toMountPoint(
          <p>
            {i18n.translate('xpack.apm.serviceInventory.toastText', {
              defaultMessage:
                "You're running Elastic Stack 7.0+ and we've detected incompatible data from a previous 6.x version. If you want to view this data in APM, you should migrate it. See more in ",
            })}

            <EuiLink href={upgradeAssistantHref}>
              {i18n.translate(
                'xpack.apm.serviceInventory.upgradeAssistantLinkText',
                {
                  defaultMessage: 'the upgrade assistant',
                }
              )}
            </EuiLink>
          </p>
        ),
      });
    }
  }, [
    mainStatisticsData.hasLegacyData,
    upgradeAssistantHref,
    core.notifications.toasts,
  ]);

  return {
    mainStatisticsData,
    mainStatisticsStatus,
    comparisonData,
  };
}

export function ServiceInventory() {
  const { mainStatisticsData, mainStatisticsStatus, comparisonData } =
    useServicesFetcher();

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
            items={mainStatisticsData.items}
            comparisonData={comparisonData}
            noItemsMessage={noItemsMessage}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
