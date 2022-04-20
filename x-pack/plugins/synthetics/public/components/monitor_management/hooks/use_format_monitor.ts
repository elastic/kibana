/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { ConfigKey, DataStream, MonitorFields } from '../../../../common/runtime_types';
import { Validation } from '../../../../common/types';

interface Props {
  monitorType: DataStream;
  defaultConfig: Partial<MonitorFields>;
  config: Partial<MonitorFields>;
  validate: Record<DataStream, Validation>;
}

export const useFormatMonitor = ({ monitorType, defaultConfig, config, validate }: Props) => {
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
      currentConfig.current = config;
      setIsValid(isValidT);
    }
  }, [config, currentConfig, validate, monitorType]);

  return {
    config,
    isValid,
  };
};
