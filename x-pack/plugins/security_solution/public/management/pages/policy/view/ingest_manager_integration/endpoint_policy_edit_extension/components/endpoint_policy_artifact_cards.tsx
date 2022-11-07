/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLoadingContent, EuiSpacer, EuiText } from '@elastic/eui';
import { useCanAccessSomeArtifacts } from '../../hooks/use_can_access_some_artifacts';
import { useCanSeeHostIsolationExceptionsMenu } from '../../../../../host_isolation_exceptions/view/hooks';
import { BlocklistsApiClient } from '../../../../../blocklist/services';
import { HostIsolationExceptionsApiClient } from '../../../../../host_isolation_exceptions/host_isolation_exceptions_api_client';
import { EventFiltersApiClient } from '../../../../../event_filters/service/api_client';
import { TrustedAppsApiClient } from '../../../../../trusted_apps/service';
import {
  getPolicyBlocklistsPath,
  getPolicyEventFiltersPath,
  getPolicyHostIsolationExceptionsPath,
  getPolicyTrustedAppsPath,
} from '../../../../../../common/routing';
import { SEARCHABLE_FIELDS as TRUSTED_APPS_SEARCHABLE_FIELDS } from '../../../../../trusted_apps/constants';
import { FleetIntegrationArtifactsCard } from '../../endpoint_package_custom_extension/components/fleet_integration_artifacts_card';
import { SEARCHABLE_FIELDS as EVENT_FILTERS_SEARCHABLE_FIELDS } from '../../../../../event_filters/constants';
import { SEARCHABLE_FIELDS as HOST_ISOLATION_EXCEPTIONS_SEARCHABLE_FIELDS } from '../../../../../host_isolation_exceptions/constants';
import { SEARCHABLE_FIELDS as BLOCKLIST_SEARCHABLE_FIELDS } from '../../../../../blocklist/constants';
import { useHttp } from '../../../../../../../common/lib/kibana';
import { useEndpointPrivileges } from '../../../../../../../common/components/user_privileges/endpoint';

export const BLOCKLISTS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate('xpack.securitySolution.endpoint.fleetIntegrationCard.blocklistsSummary.error', {
      defaultMessage: 'There was an error trying to fetch blocklists stats: "{error}"',
      values: { error },
    }),
  cardTitle: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.blocklist.fleetIntegration.title"
      defaultMessage="Blocklist"
    />
  ),
  linkLabel: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.fleetIntegrationCard.blocklistsManageLabel"
      defaultMessage="Manage blocklist"
    />
  ),
};
export const HOST_ISOLATION_EXCEPTIONS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.fleetIntegrationCard.hostIsolationExceptionsSummary.error',
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
      id="xpack.securitySolution.endpoint.fleetIntegrationCard.hostIsolationExceptionsManageLabel"
      defaultMessage="Manage host isolation exceptions"
    />
  ),
};
export const EVENT_FILTERS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.fleetIntegrationCard.eventFiltersSummarySummary.error',
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
      id="xpack.securitySolution.endpoint.fleetIntegrationCard.eventFiltersManageLabel"
      defaultMessage="Manage event filters"
    />
  ),
};
export const TRUSTED_APPS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.fleetIntegrationCard.trustedAppsSummarySummary.error',
      {
        defaultMessage: 'There was an error trying to fetch trusted apps stats: "{error}"',
        values: { error },
      }
    ),
  cardTitle: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.trustedApps.fleetIntegration.title"
      defaultMessage="Trusted applications"
    />
  ),
  linkLabel: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.fleetIntegrationCard.trustedAppsManageLabel"
      defaultMessage="Manage trusted applications"
    />
  ),
};

interface PolicyArtifactCardProps {
  policyId: string;
}

const TrustedAppsPolicyCard = memo<PolicyArtifactCardProps>(({ policyId }) => {
  const http = useHttp();
  const trustedAppsApiClientInstance = useMemo(
    () => TrustedAppsApiClient.getInstance(http),
    [http]
  );

  return (
    <FleetIntegrationArtifactsCard
      policyId={policyId}
      artifactApiClientInstance={trustedAppsApiClientInstance}
      getArtifactsPath={getPolicyTrustedAppsPath}
      searchableFields={TRUSTED_APPS_SEARCHABLE_FIELDS}
      labels={TRUSTED_APPS_LABELS}
      data-test-subj="trustedApps"
    />
  );
});
TrustedAppsPolicyCard.displayName = 'TrustedAppsPolicyCard';

const EventFiltersPolicyCard = memo<PolicyArtifactCardProps>(({ policyId }) => {
  const http = useHttp();
  const eventFiltersApiClientInstance = useMemo(
    () => EventFiltersApiClient.getInstance(http),
    [http]
  );

  return (
    <FleetIntegrationArtifactsCard
      policyId={policyId}
      artifactApiClientInstance={eventFiltersApiClientInstance}
      getArtifactsPath={getPolicyEventFiltersPath}
      searchableFields={EVENT_FILTERS_SEARCHABLE_FIELDS}
      labels={EVENT_FILTERS_LABELS}
      data-test-subj="eventFilters"
    />
  );
});
EventFiltersPolicyCard.displayName = 'EventFiltersPolicyCard';

const HostIsolationExceptionsPolicyCard = memo<PolicyArtifactCardProps>(({ policyId }) => {
  const http = useHttp();
  const hostIsolationExceptionsApiClientInstance = useMemo(
    () => HostIsolationExceptionsApiClient.getInstance(http),
    [http]
  );

  return (
    <FleetIntegrationArtifactsCard
      policyId={policyId}
      artifactApiClientInstance={hostIsolationExceptionsApiClientInstance}
      getArtifactsPath={getPolicyHostIsolationExceptionsPath}
      searchableFields={HOST_ISOLATION_EXCEPTIONS_SEARCHABLE_FIELDS}
      labels={HOST_ISOLATION_EXCEPTIONS_LABELS}
      data-test-subj="hostIsolationExceptions"
    />
  );
});
HostIsolationExceptionsPolicyCard.displayName = 'HostIsolationExceptionsPolicyCard';

const BlocklistPolicyCard = memo<PolicyArtifactCardProps>(({ policyId }) => {
  const http = useHttp();
  const blocklistsApiClientInstance = useMemo(() => BlocklistsApiClient.getInstance(http), [http]);

  return (
    <FleetIntegrationArtifactsCard
      policyId={policyId}
      artifactApiClientInstance={blocklistsApiClientInstance}
      getArtifactsPath={getPolicyBlocklistsPath}
      searchableFields={BLOCKLIST_SEARCHABLE_FIELDS}
      labels={BLOCKLISTS_LABELS}
      data-test-subj="blocklists"
    />
  );
});
BlocklistPolicyCard.displayName = 'BlocklistPolicyCard';

export interface EndpointPolicyArtifactCardsProps {
  policyId: string;
}

/**
 * Displays the Artifact cards on the Edit Integration Policy form within Fleet according to the
 * current user's authz
 */
export const EndpointPolicyArtifactCards = memo<EndpointPolicyArtifactCardsProps>(
  ({ policyId }) => {
    const canSeeHostIsolationExceptions = useCanSeeHostIsolationExceptionsMenu();
    const { loading, canReadBlocklist, canReadEventFilters, canReadTrustedApplications } =
      useEndpointPrivileges();
    const canAccessArtifactContent = useCanAccessSomeArtifacts();

    if (loading) {
      return <EuiLoadingContent lines={4} />;
    }

    if (!canAccessArtifactContent) {
      return null;
    }

    return (
      <>
        <div>
          <EuiText>
            <h5>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyDetails.artifacts.title"
                defaultMessage="Artifacts"
              />
            </h5>
          </EuiText>
          <EuiSpacer size="s" />

          {canReadTrustedApplications && (
            <>
              <TrustedAppsPolicyCard policyId={policyId} />
              <EuiSpacer size="s" />
            </>
          )}

          {canReadEventFilters && (
            <>
              <EventFiltersPolicyCard policyId={policyId} />
              <EuiSpacer size="s" />
            </>
          )}

          {canSeeHostIsolationExceptions && (
            <>
              <HostIsolationExceptionsPolicyCard policyId={policyId} />
              <EuiSpacer size="s" />
            </>
          )}

          {canReadBlocklist && <BlocklistPolicyCard policyId={policyId} />}
        </div>
        <EuiSpacer size="l" />
      </>
    );
  }
);
EndpointPolicyArtifactCards.displayName = 'EndpointPolicyArtifactCards';
