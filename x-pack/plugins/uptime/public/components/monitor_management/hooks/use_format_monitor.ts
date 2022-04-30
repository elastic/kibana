/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useRef, useState } from 'react';
import { omitBy, isNil } from 'lodash';
import { ConfigKey, DataStream, Validation, MonitorFields } from '../../fleet_package/types';
import { formatters } from '../formatters';

interface Props {
  monitorType: DataStream;
  defaultConfig: Partial<MonitorFields>;
  config: Partial<MonitorFields>;
  validate: Record<DataStream, Validation>;
}

const formatMonitorConfig = (configKeys: ConfigKey[], config: Partial<MonitorFields>) => {
  const formattedMonitor = {} as Record<ConfigKey, any>;

  configKeys.forEach((key) => {
    const value = config[key] ?? null;
    if (value && formatters[key]) {
      formattedMonitor[key] = formatters[key]?.(config);
    } else if (value) {
      formattedMonitor[key] = value;
    }
  });

  return omitBy(formattedMonitor, isNil) as Partial<MonitorFields>;
};

export const useFormatMonitor = ({ monitorType, defaultConfig, config, validate }: Props) => {
  const [formattedMonitor, setFormattedMonitor] = useState<Partial<MonitorFields>>(
    formatMonitorConfig(Object.keys(config) as ConfigKey[], config)
  );
  const [isValid, setIsValid] = useState(false);
  const currentConfig = useRef<Partial<MonitorFields>>(defaultConfig);

  useEffect(() => {
    const configKeys = Object.keys(config) as ConfigKey[];
    const validationKeys = Object.keys(validate[monitorType]) as ConfigKey[];
    const configDidUpdate = configKeys.some((key) => config[key] !== currentConfig.current[key]);
    const isValidT =
      !!config.name && !validationKeys.find((key) => validate[monitorType]?.[key]?.(config));

    // prevent an infinite loop of updating the policy
    if (configDidUpdate) {
      const formattedMonitorT = formatMonitorConfig(configKeys, config);
      currentConfig.current = config;
      setFormattedMonitor(formattedMonitorT);
      setIsValid(isValidT);
    }
  }, [config, currentConfig, validate, monitorType]);

  return {
    config,
    isValid,
    formattedMonitor,
  };
};
