/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState, useRef } from 'react';
import { PackagePolicyCreateExtensionComponentProps } from '../../../../fleet/public';
import { ConfigKeys, Config, ICustomFields } from './types';
import { CustomFields } from './custom_fields';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
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

    // update our local config state ever time name, which is managed by fleet, changes
    useEffect(() => {
      setConfig((prevConfig) => ({ ...prevConfig, name: newPolicy.name }));
    }, [newPolicy.name]);

    const handleInputChange = useCallback(
      (fields: ICustomFields) => {
        setConfig((prevConfig) => ({ ...prevConfig, ...fields }));
      },
      [setConfig]
    );

    return <CustomFields defaultValues={defaultValues} onChange={handleInputChange} />;
  }
);
SyntheticsPolicyCreateExtension.displayName = 'SyntheticsPolicyCreateExtension';

const defaultValues = {
  urls: '',
  schedule: '',
};

const defaultConfig: Config = {
  name: '',
  ...defaultValues,
};
