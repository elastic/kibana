/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { memo, useMemo } from 'react';
import { EuiSpacer, EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { PackageCustomExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { NoPrivileges } from '../../../../../../common/components/no_privileges';
import { useCanAccessSomeArtifacts } from '../hooks/use_can_access_some_artifacts';
import { useHttp } from '../../../../../../common/lib/kibana';
import { TrustedAppsApiClient } from '../../../../trusted_apps/service/api_client';
import { EventFiltersApiClient } from '../../../../event_filters/service/api_client';
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
import { useEndpointPrivileges } from '../../../../../../common/components/user_privileges/endpoint';

const TrustedAppsArtifactCard = memo<PackageCustomExtensionComponentProps>((props) => {
  const http = useHttp();
  const trustedAppsApiClientInstance = useMemo(
    () => TrustedAppsApiClient.getInstance(http),
    [http]
  );

  return (
    <FleetArtifactsCard
      {...props}
      artifactApiClientInstance={trustedAppsApiClientInstance}
      getArtifactsPath={getTrustedAppsListPath}
      labels={TRUSTED_APPS_LABELS}
      data-test-subj="trustedApps"
    />
  );
});
TrustedAppsArtifactCard.displayName = 'TrustedAppsArtifactCard';

const EventFiltersArtifactCard = memo<PackageCustomExtensionComponentProps>((props) => {
  const http = useHttp();
  const eventFiltersApiClientInstance = useMemo(
    () => EventFiltersApiClient.getInstance(http),
    [http]
  );

  return (
    <FleetArtifactsCard
      {...props}
      artifactApiClientInstance={eventFiltersApiClientInstance}
      getArtifactsPath={getEventFiltersListPath}
      labels={EVENT_FILTERS_LABELS}
      data-test-subj="eventFilters"
    />
  );
});
EventFiltersArtifactCard.displayName = 'EventFiltersArtifactCard';

const HostIsolationExceptionsArtifactCard = memo<PackageCustomExtensionComponentProps>((props) => {
  const http = useHttp();
  const hostIsolationExceptionsApiClientInstance = useMemo(
    () => HostIsolationExceptionsApiClient.getInstance(http),
    [http]
  );

  return (
    <FleetArtifactsCard
      {...props}
      artifactApiClientInstance={hostIsolationExceptionsApiClientInstance}
      getArtifactsPath={getHostIsolationExceptionsListPath}
      labels={HOST_ISOLATION_EXCEPTIONS_LABELS}
      data-test-subj="hostIsolationExceptions"
    />
  );
});
HostIsolationExceptionsArtifactCard.displayName = 'HostIsolationExceptionsArtifactCard';

const BlockListArtifactCard = memo<PackageCustomExtensionComponentProps>((props) => {
  const http = useHttp();
  const blocklistsApiClientInstance = useMemo(() => BlocklistsApiClient.getInstance(http), [http]);

  return (
    <FleetArtifactsCard
      {...props}
      artifactApiClientInstance={blocklistsApiClientInstance}
      getArtifactsPath={getBlocklistsListPath}
      labels={BLOCKLISTS_LABELS}
      data-test-subj="blocklists"
    />
  );
});
BlockListArtifactCard.displayName = 'BlockListArtifactCard';

/**
 * The UI displayed in Fleet's Endpoint integration page, under the `Advanced` tab
 */
export const EndpointPackageCustomExtension = memo<PackageCustomExtensionComponentProps>(
  (props) => {
    const {
      loading,
      canReadBlocklist,
      canReadEventFilters,
      canReadTrustedApplications,
      canReadHostIsolationExceptions,
    } = useEndpointPrivileges();

    const userCanAccessContent = useCanAccessSomeArtifacts();

    const artifactCards: ReactElement = useMemo(() => {
      if (loading) {
        return <></>;
      }

      if (!userCanAccessContent) {
        return <NoPrivileges docLinkSelector={(links) => links.securitySolution.privileges} />;
      }

      return (
        <div data-test-subj="fleetEndpointPackageCustomContent">
          {canReadTrustedApplications && (
            <>
              <TrustedAppsArtifactCard {...props} />
              <EuiSpacer />
            </>
          )}

          {canReadEventFilters && (
            <>
              <EventFiltersArtifactCard {...props} />
              <EuiSpacer />
            </>
          )}

          {canReadHostIsolationExceptions && (
            <>
              <HostIsolationExceptionsArtifactCard {...props} />
              <EuiSpacer />
            </>
          )}

          {canReadBlocklist && <BlockListArtifactCard {...props} />}
        </div>
      );
    }, [
      canReadBlocklist,
      canReadEventFilters,
      canReadTrustedApplications,
      canReadHostIsolationExceptions,
      loading,
      props,
      userCanAccessContent,
    ]);

    if (loading) {
      return (
        <EuiFlexGroup alignItems="center" justifyContent={'spaceAround'}>
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xl" />
            <EuiLoadingSpinner size="l" data-test-subj="endpointExtensionLoadingSpinner" />
            <EuiSpacer size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return artifactCards;
  }
);

EndpointPackageCustomExtension.displayName = 'EndpointPackageCustomExtension';
