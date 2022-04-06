/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useHttp } from '../../../../../../common/lib/kibana';
import { PackageCustomExtensionComponentProps } from '../../../../../../../../fleet/public';
import { useCanSeeHostIsolationExceptionsMenu } from '../../../../host_isolation_exceptions/view/hooks';
import { TrustedAppsApiClient } from '../../../../trusted_apps/service/trusted_apps_api_client';
import { EventFiltersApiClient } from '../../../../event_filters/service/event_filters_api_client';
import { HostIsolationExceptionsApiClient } from '../../../../host_isolation_exceptions/host_isolation_exceptions_api_client';
import { BlocklistsApiClient } from '../../../../blocklist/services';
import { FleetArtifactsCard } from './components/fleet_artifacts_card';
import {
  getBlocklistsListPath,
  getEventFiltersListPath,
  getHostIsolationExceptionsListPath,
  getTrustedAppsListPath,
} from '../../../../../common/routing';
import {
  BLOCKLISTS_LABELS,
  EVENT_FILTERS_LABELS,
  HOST_ISOLATION_EXCEPTIONS_LABELS,
  TRUSTED_APPS_LABELS,
} from './translations';

export const EndpointPackageCustomExtension = memo<PackageCustomExtensionComponentProps>(
  (props) => {
    const http = useHttp();
    const canSeeHostIsolationExceptions = useCanSeeHostIsolationExceptionsMenu();

    const trustedAppsApiClientInstance = useMemo(
      () => TrustedAppsApiClient.getInstance(http),
      [http]
    );

    const eventFiltersApiClientInstance = useMemo(
      () => EventFiltersApiClient.getInstance(http),
      [http]
    );

    const hostIsolationExceptionsApiClientInstance = useMemo(
      () => HostIsolationExceptionsApiClient.getInstance(http),
      [http]
    );

    const bloklistsApiClientInstance = useMemo(() => BlocklistsApiClient.getInstance(http), [http]);

    return (
      <div data-test-subj="fleetEndpointPackageCustomContent">
        <FleetArtifactsCard
          {...props}
          artifactApiClientInstance={trustedAppsApiClientInstance}
          getArtifactsPath={getTrustedAppsListPath}
          labels={TRUSTED_APPS_LABELS}
          data-test-subj="trustedApps"
        />
        <EuiSpacer />
        <FleetArtifactsCard
          {...props}
          artifactApiClientInstance={eventFiltersApiClientInstance}
          getArtifactsPath={getEventFiltersListPath}
          labels={EVENT_FILTERS_LABELS}
          data-test-subj="eventFilters"
        />
        {canSeeHostIsolationExceptions && (
          <>
            <EuiSpacer />
            <FleetArtifactsCard
              {...props}
              artifactApiClientInstance={hostIsolationExceptionsApiClientInstance}
              getArtifactsPath={getHostIsolationExceptionsListPath}
              labels={HOST_ISOLATION_EXCEPTIONS_LABELS}
              data-test-subj="hostIsolationExceptions"
            />
          </>
        )}
        <EuiSpacer />
        <FleetArtifactsCard
          {...props}
          artifactApiClientInstance={bloklistsApiClientInstance}
          getArtifactsPath={getBlocklistsListPath}
          labels={BLOCKLISTS_LABELS}
          data-test-subj="blocklists"
        />
      </div>
    );
  }
);

EndpointPackageCustomExtension.displayName = 'EndpointPackageCustomExtension';
