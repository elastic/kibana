/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useRef, useState } from 'react';
import { NewPackagePolicy } from '../../../../fleet/public';
import { ConfigKeys, Config } from './types';

interface Props {
  defaultConfig: Config;
  newPolicy: NewPackagePolicy;
  onChange: (opts: {
    /** is current form state is valid */
    isValid: boolean;
    /** The updated Integration Policy to be merged back and included in the API call */
    updatedPolicy: NewPackagePolicy;
  }) => void;
}

export const useUpdatePolicy = ({ defaultConfig, newPolicy, onChange }: Props) => {
  // Update the integration policy with our custom fields
  const [config, setConfig] = useState<Config>(defaultConfig);
  const currentConfig = useRef<Config>(defaultConfig);

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
  }, [config, currentConfig, newPolicy, onChange]);

  // update our local config state ever time name, which is managed by fleet, changes
  useEffect(() => {
    setConfig((prevConfig) => ({ ...prevConfig, name: newPolicy.name }));
  }, [newPolicy.name, setConfig]);

  return {
    setConfig,
  };
};
