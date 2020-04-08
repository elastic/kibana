/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiCheckbox } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { setIn } from '../../../../models/policy_details_config';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { policyConfig } from '../../../../store/policy_details/selectors';
import { PolicyDetailsAction } from '../../../../store/policy_details';
import { UIPolicyConfig } from '../../../../types';

export const EventingCheckbox = React.memo(function<
  T extends keyof UIPolicyConfig,
  TT extends keyof UIPolicyConfig[T],
  TTT extends keyof UIPolicyConfig[T][TT]
>({
  id,
  name,
  os,
  protectionEvent,
  protectionField,
}: {
  id: string;
  name: string;
  os: T;
  protectionEvent: TT;
  protectionField: TTT;
}) {
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
  const selected = policyDetailsConfig[os][protectionEvent][protectionField];
  const dispatch = useDispatch<(action: PolicyDetailsAction) => void>();

  const handleCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (policyDetailsConfig) {
        const payload = setIn(
          policyDetailsConfig,
          [os, protectionEvent, protectionField],
          event.target.checked
        );

        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: payload },
        });
      }
    },
    [dispatch, os, policyDetailsConfig, protectionEvent, protectionField]
  );

  return <EuiCheckbox id={id} label={name} checked={selected} onChange={handleCheckboxChange} />;
});
