/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiTitle, EuiCheckbox } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { usePolicyDetailsSelector } from '../policy_hooks';
import { selectPolicyConfig, selectWindowsEventing } from '../../../store/policy_details/selectors';
import { PolicyDetailsAction } from '../../../store/policy_details';

export const Eventing = React.memo(() => {
  const policyConfig = usePolicyDetailsSelector(selectPolicyConfig);
  const eventing = usePolicyDetailsSelector(selectWindowsEventing);
  const dispatch = useDispatch<(action: PolicyDetailsAction) => void>();

  const handleRadioChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newPayload = {
        ...policyConfig,
      };
      newPayload.windows.eventing.process = event.target.checked;

      dispatch({
        type: 'userChangedPolicyConfig',
        payload: { policyConfig: newPayload },
      });
    },
    [dispatch, policyConfig]
  );

  return (
    <>
      <EuiTitle size="l">
        <h1 data-test-subj="eventingViewTitle">{'Windows Eventing'}</h1>
      </EuiTitle>
      <EuiCheckbox
        id={'eventingProcess'}
        label="Process"
        checked={eventing.process}
        onChange={handleRadioChange}
      />
    </>
  );
});
