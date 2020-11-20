/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPage,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo } from 'react';
import url from 'url';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { useTrackPageview } from '../../../../../observability/public';
import { Projection } from '../../../../common/projections';
import { useAnomalyDetectionJobs } from '../../../hooks/useAnomalyDetectionJobs';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { SearchBar } from '../../shared/search_bar';
import { Correlations } from '../Correlations';
import { NoServicesMessage } from './no_services_message';
import { ServiceList } from './ServiceList';
import { MLCallout } from './ServiceList/MLCallout';

const initialData = {
  items: [],
  hasHistoricalData: true,
  hasLegacyData: false,
};

let hasDisplayedToast = false;

export function ServiceInventory() {
  const { core } = useApmPluginContext();
  const {
    urlParams: { start, end },
    uiFilters,
  } = useUrlParams();
  const { data = initialData, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services',
          params: {
            query: { start, end, uiFilters: JSON.stringify(uiFilters) },
          },
        });
      }
    },
    [start, end, uiFilters]
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

            <EuiLink
              href={url.format({
                pathname: core.http.basePath.prepend('/app/kibana'),
                hash: '/management/stack/upgrade_assistant',
              })}
            >
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
  }, [data.hasLegacyData, core.http.basePath, core.notifications.toasts]);

  // The page is called "service inventory" to avoid confusion with the
  // "service overview", but this is tracked in some dashboards because it's the
  // initial landing page for APM, so it stays as "services_overview" (plural.)
  // for backward compatibility.
  useTrackPageview({ app: 'apm', path: 'services_overview' });
  useTrackPageview({ app: 'apm', path: 'services_overview', delay: 15000 });

  const localFiltersConfig: React.ComponentProps<typeof LocalUIFilters> = useMemo(
    () => ({
      filterNames: ['host', 'agentName'],
      projection: Projection.services,
    }),
    []
  );

  const {
    data: anomalyDetectionJobsData,
    status: anomalyDetectionJobsStatus,
  } = useAnomalyDetectionJobs();

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
      <EuiPage>
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <Correlations />
            <LocalUIFilters {...localFiltersConfig} />
          </EuiFlexItem>
          <EuiFlexItem grow={7}>
            <EuiFlexGroup direction="column">
              {displayMlCallout ? (
                <EuiFlexItem>
                  <MLCallout
                    onDismiss={() => setUserHasDismissedCallout(true)}
                  />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem>
                <EuiPanel>
                  <ServiceList
                    items={data.items}
                    noItemsMessage={
                      <NoServicesMessage
                        historicalDataFound={data.hasHistoricalData}
                        status={status}
                      />
                    }
                  />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPage>
    </>
  );
}
