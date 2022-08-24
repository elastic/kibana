/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useRef, useState } from 'react';
import { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { formatSyntheticsPolicy } from '../../../../../common/formatters/format_synthetics_policy';
import { ConfigKey, DataStream, Validation, MonitorFields } from '../types';

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

    const { formattedPolicy, dataStream, currentInput } = formatSyntheticsPolicy(
      newPolicy,
      monitorType,
      config,
      true
    );

    // prevent an infinite loop of updating the policy
    if (currentInput && dataStream && configDidUpdate) {
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
