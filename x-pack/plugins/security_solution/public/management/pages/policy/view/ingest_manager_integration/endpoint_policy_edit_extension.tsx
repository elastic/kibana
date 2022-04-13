/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState, useMemo } from 'react';
import { EuiCallOut, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDispatch } from 'react-redux';
import {
  PackagePolicyEditExtensionComponentProps,
  NewPackagePolicy,
} from '../../../../../../../fleet/public';
import { useHttp } from '../../../../../common/lib/kibana/hooks';
import {
  getPolicyDetailPath,
  getPolicyTrustedAppsPath,
  getPolicyBlocklistsPath,
  getPolicyHostIsolationExceptionsPath,
  getPolicyEventFiltersPath,
} from '../../../../common/routing';
import { PolicyDetailsForm } from '../policy_details_form';
import { AppAction } from '../../../../../common/store/actions';
import { usePolicyDetailsSelector } from '../policy_hooks';
import {
  apiError,
  policyDetails,
  policyDetailsForUpdate,
} from '../../store/policy_details/selectors';

import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { FleetIntegrationArtifactsCard } from './endpoint_package_custom_extension/components/fleet_integration_artifacts_card';
import { BlocklistsApiClient } from '../../../blocklist/services';
import { HostIsolationExceptionsApiClient } from '../../../host_isolation_exceptions/host_isolation_exceptions_api_client';
import { EventFiltersApiClient } from '../../../event_filters/service/event_filters_api_client';
import { TrustedAppsApiClient } from '../../../trusted_apps/service/trusted_apps_api_client';
import { SEARCHABLE_FIELDS as BLOCKLIST_SEARCHABLE_FIELDS } from '../../../blocklist/constants';
import { SEARCHABLE_FIELDS as HOST_ISOLATION_EXCEPTIONS_SEARCHABLE_FIELDS } from '../../../host_isolation_exceptions/constants';
import { SEARCHABLE_FIELDS as EVENT_FILTERS_SEARCHABLE_FIELDS } from '../../../event_filters/constants';
import { SEARCHABLE_FIELDS as TRUSTED_APPS_SEARCHABLE_FIELDS } from '../../../trusted_apps/constants';
import { useEndpointPrivileges } from '../../../../../common/components/user_privileges/endpoint';

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

/**
 * Exports Endpoint-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const EndpointPolicyEditExtension = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy, onChange }) => {
    return (
      <>
        <EuiSpacer size="m" />
        <WrappedPolicyDetailsForm policyId={policy.id} onChange={onChange} />
      </>
    );
  }
);
EndpointPolicyEditExtension.displayName = 'EndpointPolicyEditExtension';

const WrappedPolicyDetailsForm = memo<{
  policyId: string;
  onChange: PackagePolicyEditExtensionComponentProps['onChange'];
}>(({ policyId, onChange }) => {
  const dispatch = useDispatch<(a: AppAction) => void>();
  const updatedPolicy = usePolicyDetailsSelector(policyDetailsForUpdate);
  const endpointPolicyDetails = usePolicyDetailsSelector(policyDetails);
  const endpointDetailsLoadingError = usePolicyDetailsSelector(apiError);
  const [, setLastUpdatedPolicy] = useState(updatedPolicy);
  const privileges = useUserPrivileges().endpointPrivileges;

  const http = useHttp();
  const blocklistsApiClientInstance = useMemo(() => BlocklistsApiClient.getInstance(http), [http]);
  const { canAccessEndpointManagement } = useEndpointPrivileges();

  const hostIsolationExceptionsApiClientInstance = useMemo(
    () => HostIsolationExceptionsApiClient.getInstance(http),
    [http]
  );

  const eventFiltersApiClientInstance = useMemo(
    () => EventFiltersApiClient.getInstance(http),
    [http]
  );

  const trustedAppsApiClientInstance = useMemo(
    () => TrustedAppsApiClient.getInstance(http),
    [http]
  );

  // When the form is initially displayed, trigger the Redux middleware which is based on
  // the location information stored via the `userChangedUrl` action.
  useEffect(() => {
    dispatch({
      type: 'userChangedUrl',
      payload: {
        hash: '',
        pathname: getPolicyDetailPath(policyId, ''),
        search: '',
      },
    });

    // When form is unloaded, reset the redux store
    return () => {
      dispatch({
        type: 'userChangedUrl',
        payload: {
          hash: '',
          pathname: '/',
          search: '',
        },
      });
    };
  }, [dispatch, policyId]);

  useEffect(() => {
    // Currently, the `onChange` callback provided by the fleet UI extension is regenerated every
    // time the policy data is updated, which means this will go into a continious loop if we don't
    // actually check to see if an update should be reported back to fleet
    setLastUpdatedPolicy((prevState) => {
      if (prevState === updatedPolicy) {
        return prevState;
      }

      if (updatedPolicy) {
        onChange({
          isValid: true,
          // send up only the updated policy data which is stored in the `inputs` section.
          // All other attributes (like name, id) are updated from the Fleet form, so we want to
          // ensure we don't override it.
          updatedPolicy: {
            // Casting is needed due to the use of `Immutable<>` in our store data
            inputs: updatedPolicy.inputs as unknown as NewPackagePolicy['inputs'],
          },
        });
      }

      return updatedPolicy;
    });
  }, [onChange, updatedPolicy]);

  const artifactCards = useMemo(
    () => (
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
          <FleetIntegrationArtifactsCard
            policyId={policyId}
            artifactApiClientInstance={trustedAppsApiClientInstance}
            getArtifactsPath={getPolicyTrustedAppsPath}
            searchableFields={TRUSTED_APPS_SEARCHABLE_FIELDS}
            labels={TRUSTED_APPS_LABELS}
            data-test-subj="trustedApps"
          />
          <EuiSpacer size="s" />
          <FleetIntegrationArtifactsCard
            policyId={policyId}
            artifactApiClientInstance={eventFiltersApiClientInstance}
            getArtifactsPath={getPolicyEventFiltersPath}
            searchableFields={EVENT_FILTERS_SEARCHABLE_FIELDS}
            labels={EVENT_FILTERS_LABELS}
            data-test-subj="eventFilters"
          />
          <EuiSpacer size="s" />
          <FleetIntegrationArtifactsCard
            policyId={policyId}
            artifactApiClientInstance={hostIsolationExceptionsApiClientInstance}
            getArtifactsPath={getPolicyHostIsolationExceptionsPath}
            searchableFields={HOST_ISOLATION_EXCEPTIONS_SEARCHABLE_FIELDS}
            labels={HOST_ISOLATION_EXCEPTIONS_LABELS}
            privileges={privileges.canIsolateHost}
            data-test-subj="hostIsolationExceptions"
          />
          <EuiSpacer size="s" />
          <FleetIntegrationArtifactsCard
            policyId={policyId}
            artifactApiClientInstance={blocklistsApiClientInstance}
            getArtifactsPath={getPolicyBlocklistsPath}
            searchableFields={BLOCKLIST_SEARCHABLE_FIELDS}
            labels={BLOCKLISTS_LABELS}
            data-test-subj="blocklists"
          />
        </div>
        <EuiSpacer size="l" />
      </>
    ),
    [
      blocklistsApiClientInstance,
      eventFiltersApiClientInstance,
      hostIsolationExceptionsApiClientInstance,
      policyId,
      privileges.canIsolateHost,
      trustedAppsApiClientInstance,
    ]
  );

  return (
    <div data-test-subj="endpointIntegrationPolicyForm">
      <>
        {canAccessEndpointManagement && artifactCards}
        <div>
          <EuiText>
            <h5>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policyDetails.settings.title"
                defaultMessage="Policy settings"
              />
            </h5>
          </EuiText>
          <EuiSpacer size="s" />
          {endpointDetailsLoadingError ? (
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policyDetails.loadError"
                  defaultMessage="Failed to load endpoint policy settings"
                />
              }
              iconType="alert"
              color="warning"
              data-test-subj="endpiontPolicySettingsLoadingError"
            >
              {endpointDetailsLoadingError.message}
            </EuiCallOut>
          ) : !endpointPolicyDetails ? (
            <EuiLoadingSpinner size="l" className="essentialAnimation" />
          ) : (
            <PolicyDetailsForm />
          )}
        </div>
      </>
    </div>
  );
});
WrappedPolicyDetailsForm.displayName = 'WrappedPolicyDetailsForm';
