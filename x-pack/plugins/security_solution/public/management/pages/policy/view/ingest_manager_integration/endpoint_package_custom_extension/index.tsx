/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { useHttp } from '../../../../../../common/lib/kibana/hooks';
import { PackageCustomExtensionComponentProps } from '../../../../../../../../fleet/public';
import { ReactQueryClientProvider } from '../../../../../../common/containers/query_client/query_client_provider';
import { FleetArtifactsCard } from './components/fleet_artifacts_card';
import {
  getBlocklistsListPath,
  getEventFiltersListPath,
  getHostIsolationExceptionsListPath,
  getTrustedAppsListPath,
} from '../../../../../common/routing';
import { TrustedAppsApiClient } from '../../../../trusted_apps/service/trusted_apps_api_client';
import { EventFiltersApiClient } from '../../../../event_filters/service/event_filters_api_client';
import { HostIsolationExceptionsApiClient } from '../../../../host_isolation_exceptions/host_isolation_exceptions_api_client';
import { BlocklistsApiClient } from '../../../../blocklist/services';

export const EndpointPackageCustomExtension = memo<PackageCustomExtensionComponentProps>(
  (props) => {
    const http = useHttp();
    const trustedAppsApiClientInstance = useMemo(
      () => TrustedAppsApiClient.getInstance(http),
      [http]
    );

    const TRUSTED_APPS_LABELS = {
      artifactsSummaryApiError: (error: string) =>
        i18n.translate(
          'xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppsSummarySummary.error',
          {
            defaultMessage: 'There was an error trying to fetch trusted apps stats: "{error}"',
            values: { error },
          }
        ),
      cardTitle: (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.trustedApps.fleetIntegration.title"
          defaultMessage="Trusted apps"
        />
      ),
      linkLabel: (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.fleetCustomExtension.trustedAppsManageLabel"
          defaultMessage="Manage trusted apps"
        />
      ),
    };
    const eventFiltersApiClientInstance = useMemo(
      () => EventFiltersApiClient.getInstance(http),
      [http]
    );

    const EVENT_FILTERS_LABELS = {
      artifactsSummaryApiError: (error: string) =>
        i18n.translate(
          'xpack.securitySolution.endpoint.fleetCustomExtension.eventFiltersSummarySummary.error',
          {
            defaultMessage: 'There was an error trying to fetch event filters stats: "{error}"',
            values: { error },
          }
        ),
      cardTitle: (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.eventFilters.fleetIntegration.title"
          defaultMessage="Event filters"
        />
      ),
      linkLabel: (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.fleetCustomExtension.eventFiltersManageLabel"
          defaultMessage="Manage event filters"
        />
      ),
    };
    const hostIsolationExceptionsApiClientInstance = useMemo(
      () => HostIsolationExceptionsApiClient.getInstance(http),
      [http]
    );

    const HOST_ISOLATION_EXCEPTIONS_LABELS = {
      artifactsSummaryApiError: (error: string) =>
        i18n.translate(
          'xpack.securitySolution.endpoint.fleetCustomExtension.hostIsolationExceptionsSummarySummary.error',
          {
            defaultMessage:
              'There was an error trying to fetch host isolation exceptions stats: "{error}"',
            values: { error },
          }
        ),
      cardTitle: (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostIsolationExceptions.fleetIntegration.title"
          defaultMessage="Host isolation exceptions"
        />
      ),
      linkLabel: (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.fleetCustomExtension.hostIsolationExceptionsManageLabel"
          defaultMessage="Manage host isolation exceptions"
        />
      ),
    };
    const bloklistsApiClientInstance = useMemo(() => BlocklistsApiClient.getInstance(http), [http]);

    const BLOCKLISTS_LABELS = {
      artifactsSummaryApiError: (error: string) =>
        i18n.translate(
          'xpack.securitySolution.endpoint.fleetCustomExtension.blocklistsSummarySummary.error',
          {
            defaultMessage: 'There was an error trying to fetch blocklists stats: "{error}"',
            values: { error },
          }
        ),
      cardTitle: (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.blocklists.fleetIntegration.title"
          defaultMessage="Blocklists"
        />
      ),
      linkLabel: (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.fleetCustomExtension.blocklistsManageLabel"
          defaultMessage="Manage blocklists"
        />
      ),
    };

    return (
      <div data-test-subj="fleetEndpointPackageCustomContent">
        <ReactQueryClientProvider>
          <FleetArtifactsCard
            {...props}
            artifactApiClientInstance={trustedAppsApiClientInstance}
            getArtifactsPath={getTrustedAppsListPath}
            labels={TRUSTED_APPS_LABELS}
          />
          <EuiSpacer />
          <FleetArtifactsCard
            {...props}
            artifactApiClientInstance={eventFiltersApiClientInstance}
            getArtifactsPath={getEventFiltersListPath}
            labels={EVENT_FILTERS_LABELS}
          />
          <EuiSpacer />
          <FleetArtifactsCard
            {...props}
            artifactApiClientInstance={hostIsolationExceptionsApiClientInstance}
            getArtifactsPath={getHostIsolationExceptionsListPath}
            labels={HOST_ISOLATION_EXCEPTIONS_LABELS}
          />
          <EuiSpacer />
          <FleetArtifactsCard
            {...props}
            artifactApiClientInstance={bloklistsApiClientInstance}
            getArtifactsPath={getBlocklistsListPath}
            labels={BLOCKLISTS_LABELS}
          />
        </ReactQueryClientProvider>
      </div>
    );
  }
);

EndpointPackageCustomExtension.displayName = 'EndpointPackageCustomExtension';
