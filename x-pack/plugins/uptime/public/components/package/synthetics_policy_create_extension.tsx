/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiForm, EuiFormRow, EuiFieldText } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { PackagePolicyCreateExtensionComponentProps } from '../../../../fleet/public';
import { ConfigKeys, Config } from './types';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    const [schedule, setSchedule] = useState<string>('');
    const [urls, setUrl] = useState<string>('');
    const [config, setConfig] = useState<Config>(defaultConfig);
    const currentConfig = useRef<Config>(defaultConfig);

    // Fleet will initialize the create form with a default name for the integratin policy, however,
    // for synthetics, we want the user to explicitely type in a name to use as the monitor name,
    // so we blank it out only during 1st component render (thus why the eslint disabled rule below).
    useEffect(() => {
      onChange({
        isValid: false,
        updatedPolicy: {
          ...newPolicy,
          name: '',
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update the integration policy with our custom fields
    useEffect(() => {
      const configKeys = Object.keys(config) as ConfigKeys[];
      const configDidUpdate = configKeys.some((key) => config[key] !== currentConfig.current[key]);
      const isValid = !!newPolicy.name && !!config.urls && !!config.schedule;

      // prevent an infinite loop of updating the policy
      if (configDidUpdate) {
        const updatedPolicy = { ...newPolicy };
        configKeys.forEach((key) => {
          const configItem = updatedPolicy.inputs[0]?.streams[0]?.vars?.[key];
          if (configItem) {
            configItem.value = config[key];
          }
        });
        currentConfig.current = config;
        onChange({
          isValid,
          updatedPolicy,
        });
      }
    }, [config, newPolicy, onChange]);

    useDebounce(
      () => {
        // urls and schedule is managed by us, name is managed by fleet
        setConfig({ name: newPolicy.name, urls, schedule });
      },
      250,
      [newPolicy.name, schedule, setConfig, urls]
    );

    return (
      <EuiFlexGroup>
        <EuiFlexItem />
        <EuiFlexItem>
          <EuiForm component="form">
            <EuiFormRow label="Schedule" isInvalid={!schedule}>
              <EuiFieldText
                value={schedule}
                onChange={(event) => handleInputChange({ event, onInputChange: setSchedule })}
              />
            </EuiFormRow>
            <EuiFormRow label="Url" isInvalid={!urls}>
              <EuiFieldText
                value={urls}
                onChange={(event) => handleInputChange({ event, onInputChange: setUrl })}
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
SyntheticsPolicyCreateExtension.displayName = 'SyntheticsPolicyCreateExtension';

const handleInputChange = ({
  event,
  onInputChange,
}: {
  event: React.ChangeEvent<HTMLInputElement>;
  onInputChange: (value: string) => void;
}) => {
  onInputChange(event.target.value);
};

const defaultConfig: Config = {
  name: '',
  urls: '',
  schedule: '',
};
