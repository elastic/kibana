/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { useConnectionProfiles } from './use_connection_profiles';
import { ThrottlingDisabledCallout } from './throttling_disabled_callout';
import { ThrottlingConfig } from '../../../../../../../common/runtime_types';
import { ThrottlingFields } from './throttling_fields';
import { CONNECTION_PROFILE_VALUES, PROFILE_VALUES, PROFILES_MAP } from '../../constants';
import { ConnectionProfile } from './connection_profile';

export interface ThrottlingConfigFieldProps {
  ariaLabel: string;
  id: string;
  onChange: (value: ThrottlingConfig) => void;
  value: ThrottlingConfig;
  placeholder?: string;
  height?: string;
  readOnly?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  options: typeof PROFILE_OPTIONS;
  initialValue?: ThrottlingConfig;
}

export const ThrottlingConfigField = (props: ThrottlingConfigFieldProps) => {
  const { value, initialValue } = props;

  const isCustom = PROFILES_MAP[value?.id] === undefined;

  const isThrottlingDisabled = value?.id === CONNECTION_PROFILE_VALUES.NO_THROTTLING;

  const options = useConnectionProfiles(initialValue);

  return (
    <>
      <EuiSuperSelect
        data-test-subj="syntheticsThrottlingSelect"
        options={options}
        onChange={(newValue) => {
          props.onChange({
            ...PROFILES_MAP[CONNECTION_PROFILE_VALUES.DEFAULT],
            ...PROFILES_MAP[newValue],
            id: newValue,
            label: 'Custom',
          });
        }}
        defaultValue={CONNECTION_PROFILE_VALUES.DEFAULT}
        valueOfSelected={value?.id}
        fullWidth={props.fullWidth}
        readOnly={props.readOnly}
      />
      {isThrottlingDisabled && <ThrottlingDisabledCallout />}
      {isCustom && <ThrottlingFields throttling={props?.value} setValue={props.onChange} />}
    </>
  );
};

export const PROFILE_OPTIONS = PROFILE_VALUES.map(({ id }) => ({
  value: id,
  inputDisplay: <ConnectionProfile throttling={PROFILES_MAP[id]} />,
  'data-test-subj': `syntheticsThrottlingSelect-${id}`,
}));
