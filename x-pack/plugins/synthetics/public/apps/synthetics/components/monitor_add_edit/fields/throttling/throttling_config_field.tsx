/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { syntheticsThrottlingEnabled } from '@kbn/observability-plugin/public';
import { useConnectionProfiles } from './use_connection_profiles';
import { ThrottlingDisabledCallout } from './throttling_disabled_callout';
import { ThrottlingConfig } from '../../../../../../../common/runtime_types';
import { ThrottlingFields } from './throttling_fields';
import { PROFILE_VALUES_ENUM, PROFILE_VALUES, PROFILES_MAP, CUSTOM_LABEL } from '../../constants';
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

  const isThrottlingDisabled = value?.id === PROFILE_VALUES_ENUM.NO_THROTTLING;

  const options = useConnectionProfiles(initialValue);

  const isThrottlingEnabled = useUiSetting<boolean>(syntheticsThrottlingEnabled);

  const isReadOnly = props.readOnly || !isThrottlingEnabled;

  return (
    <>
      <EuiSuperSelect
        data-test-subj="syntheticsThrottlingSelect"
        options={options}
        onChange={(newValue) => {
          if (newValue === PROFILE_VALUES_ENUM.CUSTOM) {
            props.onChange({
              ...PROFILES_MAP[PROFILE_VALUES_ENUM.DEFAULT],
              id: PROFILE_VALUES_ENUM.CUSTOM,
              label: CUSTOM_LABEL,
            });
          } else {
            props.onChange({
              ...PROFILES_MAP[PROFILE_VALUES_ENUM.DEFAULT],
              ...PROFILES_MAP[newValue],
            });
          }
        }}
        defaultValue={PROFILE_VALUES_ENUM.DEFAULT}
        valueOfSelected={value?.id}
        fullWidth={props.fullWidth}
        readOnly={isReadOnly}
      />
      {isThrottlingDisabled && <ThrottlingDisabledCallout />}
      {isCustom && (
        <ThrottlingFields
          throttling={props?.value}
          setValue={props.onChange}
          readOnly={isReadOnly}
        />
      )}
    </>
  );
};

export const PROFILE_OPTIONS = PROFILE_VALUES.map(({ id }) => ({
  value: id,
  inputDisplay: <ConnectionProfile throttling={PROFILES_MAP[id]} id={id} />,
  'data-test-subj': `syntheticsThrottlingSelect-${id}`,
}));
