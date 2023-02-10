/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLoadingContent, EuiSpacer, EuiText } from '@elastic/eui';
import { useUserPrivileges } from '../../../../../../../common/components/user_privileges';
import {
  BLOCKLISTS_LABELS,
  EVENT_FILTERS_LABELS,
  HOST_ISOLATION_EXCEPTIONS_LABELS,
  TRUSTED_APPS_LABELS,
} from '../translations';
import { useCanAccessSomeArtifacts } from '../../hooks/use_can_access_some_artifacts';
import { BlocklistsApiClient } from '../../../../../blocklist/services';
import { HostIsolationExceptionsApiClient } from '../../../../../host_isolation_exceptions/host_isolation_exceptions_api_client';
import { EventFiltersApiClient } from '../../../../../event_filters/service/api_client';
import { TrustedAppsApiClient } from '../../../../../trusted_apps/service';
import {
  getBlocklistsListPath,
  getEventFiltersListPath,
  getHostIsolationExceptionsListPath,
  getPolicyBlocklistsPath,
  getPolicyEventFiltersPath,
  getPolicyHostIsolationExceptionsPath,
  getPolicyTrustedAppsPath,
  getTrustedAppsListPath,
} from '../../../../../../common/routing';
import { SEARCHABLE_FIELDS as TRUSTED_APPS_SEARCHABLE_FIELDS } from '../../../../../trusted_apps/constants';
import type { FleetIntegrationArtifactCardProps } from './fleet_integration_artifacts_card';
import { FleetIntegrationArtifactsCard } from './fleet_integration_artifacts_card';
import { SEARCHABLE_FIELDS as EVENT_FILTERS_SEARCHABLE_FIELDS } from '../../../../../event_filters/constants';
import { SEARCHABLE_FIELDS as HOST_ISOLATION_EXCEPTIONS_SEARCHABLE_FIELDS } from '../../../../../host_isolation_exceptions/constants';
import { SEARCHABLE_FIELDS as BLOCKLIST_SEARCHABLE_FIELDS } from '../../../../../blocklist/constants';
import { useHttp } from '../../../../../../../common/lib/kibana';

interface PolicyArtifactCardProps {
  policyId: string;
}

const TrustedAppsPolicyCard = memo<PolicyArtifactCardProps>(({ policyId }) => {
  const http = useHttp();
  const trustedAppsApiClientInstance = useMemo(
    () => TrustedAppsApiClient.getInstance(http),
    [http]
  );
  const { canReadPolicyManagement } = useUserPrivileges().endpointPrivileges;

  const getArtifactPathHandler: FleetIntegrationArtifactCardProps['getArtifactsPath'] =
    useCallback(() => {
      if (canReadPolicyManagement) {
        return getPolicyTrustedAppsPath(policyId);
      }

      return getTrustedAppsListPath({ includedPolicies: `${policyId},global` });
    }, [canReadPolicyManagement, policyId]);

  return (
    <FleetIntegrationArtifactsCard
      policyId={policyId}
      artifactApiClientInstance={trustedAppsApiClientInstance}
      getArtifactsPath={getArtifactPathHandler}
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
  const { canReadPolicyManagement } = useUserPrivileges().endpointPrivileges;

  const getArtifactPathHandler: FleetIntegrationArtifactCardProps['getArtifactsPath'] =
    useCallback(() => {
      if (canReadPolicyManagement) {
        return getPolicyEventFiltersPath(policyId);
      }

      return getEventFiltersListPath({ includedPolicies: `${policyId},global` });
    }, [canReadPolicyManagement, policyId]);

  return (
    <FleetIntegrationArtifactsCard
      policyId={policyId}
      artifactApiClientInstance={eventFiltersApiClientInstance}
      getArtifactsPath={getArtifactPathHandler}
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
  const { canReadPolicyManagement } = useUserPrivileges().endpointPrivileges;

  const getArtifactPathHandler: FleetIntegrationArtifactCardProps['getArtifactsPath'] =
    useCallback(() => {
      if (canReadPolicyManagement) {
        return getPolicyHostIsolationExceptionsPath(policyId);
      }

      return getHostIsolationExceptionsListPath({ includedPolicies: `${policyId},global` });
    }, [canReadPolicyManagement, policyId]);

  return (
    <FleetIntegrationArtifactsCard
      policyId={policyId}
      artifactApiClientInstance={hostIsolationExceptionsApiClientInstance}
      getArtifactsPath={getArtifactPathHandler}
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
  const { canReadPolicyManagement } = useUserPrivileges().endpointPrivileges;

  const getArtifactPathHandler: FleetIntegrationArtifactCardProps['getArtifactsPath'] =
    useCallback(() => {
      if (canReadPolicyManagement) {
        return getPolicyBlocklistsPath(policyId);
      }

      return getBlocklistsListPath({ includedPolicies: `${policyId},global` });
    }, [canReadPolicyManagement, policyId]);
  return (
    <FleetIntegrationArtifactsCard
      policyId={policyId}
      artifactApiClientInstance={blocklistsApiClientInstance}
      getArtifactsPath={getArtifactPathHandler}
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
    const {
      loading,
      canReadBlocklist,
      canReadEventFilters,
      canReadTrustedApplications,
      canReadHostIsolationExceptions,
    } = useUserPrivileges().endpointPrivileges;
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

          {canReadHostIsolationExceptions && (
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
