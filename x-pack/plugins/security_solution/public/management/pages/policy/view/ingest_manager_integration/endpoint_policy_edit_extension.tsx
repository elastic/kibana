/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import {
  PackagePolicyEditExtensionComponentProps,
  NewPackagePolicy,
} from '../../../../../../../fleet/public';
import { getPolicyDetailPath } from '../../../../common/routing';
import { PolicyDetailsForm } from '../policy_details_form';
import { AppAction } from '../../../../../common/store/actions';
import { usePolicyDetailsSelector } from '../policy_hooks';
import { policyDetailsForUpdate } from '../../store/policy_details/selectors';

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
            inputs: (updatedPolicy.inputs as unknown) as NewPackagePolicy['inputs'],
          },
        });
      }

      return updatedPolicy;
    });
  }, [onChange, updatedPolicy]);

  return (
    <div data-test-subj="endpointIntegrationPolicyForm">
      <PolicyDetailsForm />
    </div>
  );
});
WrappedPolicyDetailsForm.displayName = 'WrappedPolicyDetailsForm';
