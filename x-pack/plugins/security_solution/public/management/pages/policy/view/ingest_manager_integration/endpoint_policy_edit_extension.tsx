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
  pagePathGetters,
} from '../../../../../../../fleet/public';
import { INTEGRATIONS_PLUGIN_ID } from '../../../../../../../fleet/common';
import { useAppUrl } from '../../../../../common/lib/kibana/hooks';
import { PolicyDetailsRouteState } from '../../../../../../common/endpoint/types';
import { getPolicyDetailPath, getPolicyTrustedAppsPath } from '../../../../common/routing';
import { PolicyDetailsForm } from '../policy_details_form';
import { AppAction } from '../../../../../common/store/actions';
import { usePolicyDetailsSelector } from '../policy_hooks';
import {
  apiError,
  policyDetails,
  policyDetailsForUpdate,
} from '../../store/policy_details/selectors';
import { FleetTrustedAppsCard } from './endpoint_package_custom_extension/components/fleet_trusted_apps_card';
import { LinkWithIcon } from './endpoint_package_custom_extension/components/link_with_icon';
import { FleetIntegrationHostIsolationExceptionsCard } from './endpoint_package_custom_extension/components/fleet_integration_host_isolation_exceptions_card';
import { FleetIntegrationEventFiltersCard } from './endpoint_package_custom_extension/components/fleet_integration_event_filters_card';
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
  const { getAppUrl } = useAppUrl();
  const [, setLastUpdatedPolicy] = useState(updatedPolicy);

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

  const policyTrustedAppsPath = useMemo(() => getPolicyTrustedAppsPath(policyId), [policyId]);
  const policyTrustedAppRouteState = useMemo<PolicyDetailsRouteState>(() => {
    const fleetPackageIntegrationCustomUrlPath = `#${
      pagePathGetters.integration_policy_edit({ packagePolicyId: policyId })[1]
    }`;

    return {
      backLink: {
        label: i18n.translate(
          'xpack.securitySolution.endpoint.fleetCustomExtension.artifacts.backButtonLabel',
          {
            defaultMessage: `Back to Fleet integration policy`,
          }
        ),
        navigateTo: [
          INTEGRATIONS_PLUGIN_ID,
          {
            path: fleetPackageIntegrationCustomUrlPath,
          },
        ],
        href: getAppUrl({
          appId: INTEGRATIONS_PLUGIN_ID,
          path: fleetPackageIntegrationCustomUrlPath,
        }),
      },
    };
  }, [getAppUrl, policyId]);

  const policyTrustedAppsLink = useMemo(
    () => (
      <LinkWithIcon
        href={getAppUrl({
          path: policyTrustedAppsPath,
        })}
        appPath={policyTrustedAppsPath}
        appState={policyTrustedAppRouteState}
        data-test-subj="linkToTrustedApps"
        size="m"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpoint.fleetCustomExtension.manageTrustedAppLinkLabel"
          defaultMessage="Manage trusted applications"
        />
      </LinkWithIcon>
    ),
    [getAppUrl, policyTrustedAppsPath, policyTrustedAppRouteState]
  );

  return (
    <div data-test-subj="endpointIntegrationPolicyForm">
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
          <FleetTrustedAppsCard
            policyId={policyId}
            cardSize="m"
            customLink={policyTrustedAppsLink}
          />
          <EuiSpacer size="s" />
          <FleetIntegrationEventFiltersCard policyId={policyId} />
          <EuiSpacer size="s" />
          <FleetIntegrationHostIsolationExceptionsCard policyId={policyId} />
        </div>
        <EuiSpacer size="l" />
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
