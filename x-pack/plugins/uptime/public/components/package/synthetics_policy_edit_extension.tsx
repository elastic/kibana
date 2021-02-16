/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState, useRef } from 'react';
import { PackagePolicyEditExtensionComponentProps } from '../../../../fleet/public';
import { ConfigKeys, Config, ICustomFields } from './types';
import { CustomFields } from './custom_fields';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyEditExtension = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy: currentPolicy, newPolicy, onChange }) => {
    const defaultConfig = {
      name: currentPolicy.name,
      urls: currentPolicy.inputs[0]?.streams[0]?.vars?.urls.value,
      schedule: currentPolicy.inputs[0]?.streams[0]?.vars?.schedule.value,
    };
    const [config, setConfig] = useState<Config>(defaultConfig);
    const currentConfig = useRef<Config>(defaultConfig);

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

    useEffect(() => {
      setConfig((prevConfig) => ({ ...prevConfig, name: newPolicy.name }));
    }, [newPolicy.name]);

    const handleInputChange = useCallback(
      (fields: ICustomFields) => {
        setConfig((prevConfig) => ({ ...prevConfig, ...fields }));
      },
      [setConfig]
    );

    return (
      <CustomFields
        defaultValues={{ urls: defaultConfig.urls, schedule: defaultConfig.schedule }}
        onChange={handleInputChange}
      />
    );
  }
);
SyntheticsPolicyEditExtension.displayName = 'SyntheticsPolicyEditExtension';
