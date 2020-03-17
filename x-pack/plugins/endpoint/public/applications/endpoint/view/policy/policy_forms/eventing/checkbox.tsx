/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiCheckbox } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import {
  selectPolicyConfig,
  selectWindowsEventing,
} from '../../../../store/policy_details/selectors';
import { PolicyDetailsAction } from '../../../../store/policy_details';
import { OS, EventingFields } from '../../../../types';

export const EventingCheckbox: React.FC<{
  id: string;
  name: string;
  os: OS;
  protectionField: EventingFields;
}> = React.memo(({ id, name, os, protectionField }) => {
  const policyConfig = usePolicyDetailsSelector(selectPolicyConfig);
  const eventing = usePolicyDetailsSelector(selectWindowsEventing);
  const dispatch = useDispatch<(action: PolicyDetailsAction) => void>();

  const handleRadioChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newPayload = {
        ...policyConfig,
      };
      newPayload[os].eventing[protectionField] = event.target.checked;

      dispatch({
        type: 'userChangedPolicyConfig',
        payload: { policyConfig: newPayload },
      });
    },
    [dispatch, os, policyConfig, protectionField]
  );

  return (
    <>
      <EuiCheckbox
        id={id}
        label={name}
        checked={eventing[protectionField]}
        onChange={handleRadioChange}
      />
    </>
  );
});
