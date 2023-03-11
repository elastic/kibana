/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import { EuiCallOut, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDispatch } from 'react-redux';
import type {
  PackagePolicyEditExtensionComponentProps,
  NewPackagePolicy,
} from '@kbn/fleet-plugin/public';
import { EndpointPolicyArtifactCards } from './components/endpoint_policy_artifact_cards';
import { getPolicyDetailPath } from '../../../../../common/routing';
import { PolicyDetailsForm } from '../../policy_details_form';
import type { AppAction } from '../../../../../../common/store/actions';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import {
  apiError,
  policyDetails,
  policyDetailsForUpdate,
} from '../../../store/policy_details/selectors';

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
    // time the policy data is updated, which means this will go into a continuous loop if we don't
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

  return (
    <div data-test-subj="endpointIntegrationPolicyForm">
      <EndpointPolicyArtifactCards policyId={policyId} />
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
    </div>
  );
});
WrappedPolicyDetailsForm.displayName = 'WrappedPolicyDetailsForm';
