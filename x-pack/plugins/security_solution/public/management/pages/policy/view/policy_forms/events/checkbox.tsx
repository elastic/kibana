/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiCheckbox, EuiCheckboxProps, htmlIdGenerator } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { policyConfig } from '../../../store/policy_details/selectors';
import { PolicyDetailsAction } from '../../../store/policy_details';
import { UIPolicyConfig } from '../../../../../../../common/endpoint/types';

type EventsCheckboxProps = Omit<EuiCheckboxProps, 'id' | 'label' | 'checked' | 'onChange'> & {
  name: string;
  setter: (config: UIPolicyConfig, checked: boolean) => UIPolicyConfig;
  getter: (config: UIPolicyConfig) => boolean;
};

export const EventsCheckbox = React.memo(function ({
  name,
  setter,
  getter,
  ...otherProps
}: EventsCheckboxProps) {
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
  const selected = getter(policyDetailsConfig);
  const dispatch = useDispatch<(action: PolicyDetailsAction) => void>();

  const handleCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (policyDetailsConfig) {
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: setter(policyDetailsConfig, event.target.checked) },
        });
      }
    },
    [dispatch, policyDetailsConfig, setter]
  );

  return (
    <EuiCheckbox
      id={useMemo(() => htmlIdGenerator()(), [])}
      label={name}
      checked={selected}
      onChange={handleCheckboxChange}
      {...otherProps}
    />
  );
});

EventsCheckbox.displayName = 'EventsCheckbox';
