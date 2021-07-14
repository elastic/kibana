/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { useAnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useUpgradeAssistantHref } from '../../shared/Links/kibana';
import { SearchBar } from '../../shared/search_bar';
import { NoServicesMessage } from './no_services_message';
import { ServiceList } from './service_list';
import { MLCallout } from './service_list/MLCallout';

const initialData = {
  items: [],
  hasHistoricalData: true,
  hasLegacyData: false,
};

let hasDisplayedToast = false;

function useServicesFetcher() {
  const {
    urlParams: { environment, kuery, start, end },
  } = useUrlParams();
  const { core } = useApmPluginContext();
  const upgradeAssistantHref = useUpgradeAssistantHref();

  const { data = initialData, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services',
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
            },
          },
        });
      }
    },
    [environment, kuery, start, end]
  );

  useEffect(() => {
    if (data.hasLegacyData && !hasDisplayedToast) {
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
  }, [data.hasLegacyData, upgradeAssistantHref, core.notifications.toasts]);

  return { servicesData: data, servicesStatus: status };
}

export function ServiceInventory() {
  const { core } = useApmPluginContext();
  const { servicesData, servicesStatus } = useServicesFetcher();

  const {
    anomalyDetectionJobsData,
    anomalyDetectionJobsStatus,
  } = useAnomalyDetectionJobsContext();

  const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
    'apm.userHasDismissedServiceInventoryMlCallout',
    false
  );

  const canCreateJob = !!core.application.capabilities.ml?.canCreateJob;

  const displayMlCallout =
    anomalyDetectionJobsStatus === FETCH_STATUS.SUCCESS &&
    !anomalyDetectionJobsData?.jobs.length &&
    canCreateJob &&
    !userHasDismissedCallout;

  return (
    <>
      <SearchBar />
      <EuiFlexGroup direction="column" gutterSize="s">
        {displayMlCallout && (
          <EuiFlexItem>
            <MLCallout onDismiss={() => setUserHasDismissedCallout(true)} />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <ServiceList
            items={servicesData.items}
            noItemsMessage={
              <NoServicesMessage
                historicalDataFound={servicesData.hasHistoricalData}
                status={servicesStatus}
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
