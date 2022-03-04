/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useRef, useState } from 'react';
import { NewPackagePolicy } from '../../../../../fleet/public';
import { ConfigKey, DataStream, Validation, MonitorFields } from '../types';
import { formatters } from '../helpers/formatters';

interface Props {
  monitorType: DataStream;
  defaultConfig: Partial<MonitorFields>;
  config: Partial<MonitorFields>;
  newPolicy: NewPackagePolicy;
  onChange: (opts: {
    /** is current form state is valid */
    isValid: boolean;
    /** The updated Integration Policy to be merged back and included in the API call */
    updatedPolicy: NewPackagePolicy;
  }) => void;
  validate: Record<DataStream, Validation>;
}

export const useUpdatePolicy = ({
  monitorType,
  defaultConfig,
  config,
  newPolicy,
  onChange,
  validate,
}: Props) => {
  const [updatedPolicy, setUpdatedPolicy] = useState<NewPackagePolicy>(newPolicy);
  // Update the integration policy with our custom fields
  const currentConfig = useRef<Partial<MonitorFields>>(defaultConfig);

  useEffect(() => {
    const configKeys = Object.keys(config) as ConfigKey[];
    const validationKeys = Object.keys(validate[monitorType]) as ConfigKey[];
    const configDidUpdate = configKeys.some((key) => config[key] !== currentConfig.current[key]);
    const isValid =
      !!newPolicy.name && !validationKeys.find((key) => validate[monitorType]?.[key]?.(config));
    const formattedPolicy = { ...newPolicy };
    const currentInput = formattedPolicy.inputs.find(
      (input) => input.type === `synthetics/${monitorType}`
    );
    const dataStream = currentInput?.streams.find(
      (stream) => stream.data_stream.dataset === monitorType
    );
    formattedPolicy.inputs.forEach((input) => (input.enabled = false));
    if (currentInput && dataStream) {
      // reset all data streams to enabled false
      formattedPolicy.inputs.forEach((input) => (input.enabled = false));
      // enable only the input type and data stream that matches the monitor type.
      currentInput.enabled = true;
      dataStream.enabled = true;
    }

    // prevent an infinite loop of updating the policy
    if (currentInput && dataStream && configDidUpdate) {
      configKeys.forEach((key) => {
        const configItem = dataStream.vars?.[key];
        if (configItem && formatters[key]) {
          configItem.value = formatters[key]?.(config);
        } else if (configItem) {
          configItem.value = config[key] === undefined || config[key] === null ? null : config[key];
        }
      });
      currentConfig.current = config;
      setUpdatedPolicy(formattedPolicy);
      onChange({
        isValid,
        updatedPolicy: formattedPolicy,
      });
    }
  }, [config, currentConfig, newPolicy, onChange, validate, monitorType]);

  return {
    config,
    updatedPolicy,
  };
};
