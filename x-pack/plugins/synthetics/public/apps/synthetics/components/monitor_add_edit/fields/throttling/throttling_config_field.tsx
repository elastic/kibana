/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiText } from '@elastic/eui';
import { fetchMonitorProfileAction } from '../../../../state/monitor_management/actions';
import { selectMonitorProfiles } from '../../../../state/monitor_management/selectors';
import { ThrottlingDisabledCallout } from './throttling_disabled_callout';
import { ThrottlingConfig } from '../../../../../../../common/runtime_types';
import { ThrottlingFields } from './throttling_fields';
import { CONNECTION_PROFILE_VALUES, PROFILES_MAP } from '../../constants';

export interface ThrottlingConfigFieldProps {
  ariaLabel: string;
  id: string;
  onChange: (value: ThrottlingConfig) => void;
  defaultValue: ThrottlingConfig;
  placeholder?: string;
  height?: string;
  readOnly?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  options: typeof CONNECTION_PROFILE_OPTIONS;
  initialValue?: ThrottlingConfig;
}

export const ThrottlingConfigField = (props: ThrottlingConfigFieldProps) => {
  const { defaultValue, initialValue } = props;

  const [options, setOptions] = useState<typeof CONNECTION_PROFILE_OPTIONS>([]);

  const isCustom =
    PROFILES_MAP[defaultValue?.label] === undefined && defaultValue?.label !== initialValue?.label;

  const isThrottlingDisabled = defaultValue?.label === CONNECTION_PROFILE_VALUES.NO_THROTTLING;

  const { profiles, loaded } = useSelector(selectMonitorProfiles);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!loaded) {
      dispatch(fetchMonitorProfileAction.get());
    }
  }, [dispatch, loaded]);

  useEffect(() => {
    if (initialValue && PROFILES_MAP[initialValue.label] === undefined) {
      const newOptions = [
        ...CONNECTION_PROFILE_OPTIONS,
        ...profiles.map((profile) => ({
          value: profile.label,
          inputDisplay: (
            <ConnectionProfile
              label={profile.label}
              value={`(${profile.value.download} Mbps, ${profile.value.upload} Mbps, ${profile.value.latency} ms)`}
            />
          ),
        })),
      ];
      if (profiles.some((profile) => profile.label === initialValue.label)) {
        setOptions(newOptions);
      } else {
        setOptions([
          ...newOptions,
          {
            value: initialValue.label,
            inputDisplay: (
              <ConnectionProfile
                label={initialValue.label}
                value={`(${initialValue.value.download} Mbps, ${initialValue.value.upload} Mbps, ${initialValue.value.latency} ms)`}
              />
            ),
          },
        ]);
      }
    } else {
      setOptions(CONNECTION_PROFILE_OPTIONS);
    }
  }, [initialValue, profiles]);

  return (
    <>
      <EuiSuperSelect
        data-test-subj="syntheticsThrottlingSelect"
        options={options}
        onChange={(value) => {
          props.onChange({
            ...PROFILES_MAP[CONNECTION_PROFILE_VALUES.DEFAULT],
            ...PROFILES_MAP[value],
            label: value,
          });
        }}
        defaultValue={CONNECTION_PROFILE_VALUES.DEFAULT}
        valueOfSelected={isCustom ? 'custom' : defaultValue?.label}
        fullWidth={props.fullWidth}
        readOnly={props.readOnly}
      />
      {isThrottlingDisabled && <ThrottlingDisabledCallout />}
      {isCustom && <ThrottlingFields throttling={props?.defaultValue} setValue={props.onChange} />}
    </>
  );
};

export const ConnectionProfile = ({ label, value }: { label: string; value: string }) => {
  return (
    <EuiFlexGroup alignItems="baseline" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiText>{label}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {value}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const CONNECTION_PROFILE_OPTIONS = [
  {
    value: CONNECTION_PROFILE_VALUES.DEFAULT,
    inputDisplay: <ConnectionProfile label="Default" value="(5 Mbps, 3 Mbps, 20 ms)" />,
  },
  {
    value: CONNECTION_PROFILE_VALUES.CABLE,
    inputDisplay: <ConnectionProfile label="Cable" value="(5 Mbps, 1 Mbps, 28 ms)" />,
  },
  {
    value: CONNECTION_PROFILE_VALUES.DSL,
    inputDisplay: <ConnectionProfile label="DSL" value="(1.5 Mbps, 0.384 Mbps, 50 ms)" />,
  },
  {
    value: CONNECTION_PROFILE_VALUES.THREE_G,
    inputDisplay: <ConnectionProfile label="3G" value="(1.6 Mbps, 0.768 Mbps, 300 ms)" />,
  },
  {
    value: CONNECTION_PROFILE_VALUES.FOUR_G,
    inputDisplay: <ConnectionProfile label="4G" value="(9 Mbps, 0.750 Mbps, 170 ms)" />,
  },
  {
    value: CONNECTION_PROFILE_VALUES.LTE,
    inputDisplay: <ConnectionProfile label="LTE" value="(12 Mbps, 0.750 Mbps, 70 ms)" />,
  },
  {
    value: CONNECTION_PROFILE_VALUES.FIBRE,
    inputDisplay: <ConnectionProfile label="Fibre" value="(20 Mbps, 5 Mbps, 4 ms)" />,
  },
  {
    value: CONNECTION_PROFILE_VALUES.NO_THROTTLING,
    inputDisplay: <ConnectionProfile label="No Throttling" value="" />,
  },
  {
    value: 'custom',
    inputDisplay: <ConnectionProfile label="Custom" value="(X Mbps, Y Mbps, Z ms)" />,
  },
];
