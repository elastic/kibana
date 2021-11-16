/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useRef, useState } from 'react';
import { omitBy, isNil } from 'lodash';
import { ConfigKeys, DataStream, Validation, ICustomFields } from '../../../fleet_package/types';
import { formatters } from '../../../fleet_package/helpers/formatters';

interface Props {
  monitorType: DataStream;
  defaultConfig: Partial<ICustomFields>;
  config: Partial<ICustomFields>;
  validate: Record<DataStream, Validation>;
}

const formatMonitorConfig = (configKeys: ConfigKeys[], config: Partial<ICustomFields>) => {
  const formattedMonitor = {} as Record<ConfigKeys, any>;

  configKeys.forEach((key) => {
    const value = config[key] ?? null;
    if (value && formatters[key]) {
      formattedMonitor[key] = formatters[key]?.(config);
    } else if (value) {
      formattedMonitor[key] = value;
    }
  });

  return omitBy(formattedMonitor, isNil) as Partial<ICustomFields>;
};

export const useUpdateMonitor = ({
  monitorType,
  defaultConfig,
  config,
  //   onChange,
  validate,
}: Props) => {
  const [updatedMonitor, setUpdatedMonitor] = useState<Partial<ICustomFields>>(
    formatMonitorConfig(Object.keys(config) as ConfigKeys[], config)
  );
  const [isValid, setIsValid] = useState(false);
  // Update the integration policy with our custom fields
  const currentConfig = useRef<Partial<ICustomFields>>(defaultConfig);

  useEffect(() => {
    const configKeys = Object.keys(config) as ConfigKeys[];
    const validationKeys = Object.keys(validate[monitorType]) as ConfigKeys[];
    const configDidUpdate = configKeys.some((key) => config[key] !== currentConfig.current[key]);
    const isValidT =
      !!config.name && !validationKeys.find((key) => validate[monitorType]?.[key]?.(config));

    // prevent an infinite loop of updating the policy
    if (configDidUpdate) {
      const formattedMonitor = formatMonitorConfig(configKeys, config);
      currentConfig.current = config;
      setUpdatedMonitor(formattedMonitor);
      setIsValid(isValidT);
    }
  }, [config, currentConfig, validate, monitorType]);

  return {
    config,
    isValid,
    updatedMonitor,
  };
};
