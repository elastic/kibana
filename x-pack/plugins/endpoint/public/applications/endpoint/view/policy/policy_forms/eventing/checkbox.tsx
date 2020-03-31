/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiCheckbox } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { policyConfig, windowsEventing } from '../../../../store/policy_details/selectors';
import { PolicyDetailsAction } from '../../../../store/policy_details';
import { OS, EventingFields } from '../../../../types';
import { clone } from '../../../../models/policy_details_config';

export const EventingCheckbox: React.FC<{
  id: string;
  name: string;
  os: OS;
  protectionField: EventingFields;
}> = React.memo(({ id, name, os, protectionField }) => {
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
  const eventing = usePolicyDetailsSelector(windowsEventing);
  const dispatch = useDispatch<(action: PolicyDetailsAction) => void>();

  const handleRadioChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (policyDetailsConfig) {
        const newPayload = clone(policyDetailsConfig);
        if (os === OS.linux || os === OS.mac) {
          newPayload[os].events.process = event.target.checked;
        } else {
          newPayload[os].events[protectionField] = event.target.checked;
        }

        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: newPayload },
        });
      }
    },
    [dispatch, os, policyDetailsConfig, protectionField]
  );

  return (
    <EuiCheckbox
      id={id}
      label={name}
      checked={eventing && eventing[protectionField]}
      onChange={handleRadioChange}
    />
  );
});
