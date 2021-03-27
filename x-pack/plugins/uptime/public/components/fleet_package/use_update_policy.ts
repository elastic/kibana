/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useRef, useState } from 'react';
import { NewPackagePolicy } from '../../../../fleet/public';
import { ConfigKeys, Config, DataStream, Validation } from './types';

interface Props {
  defaultConfig: Config;
  newPolicy: NewPackagePolicy;
  onChange: (opts: {
    /** is current form state is valid */
    isValid: boolean;
    /** The updated Integration Policy to be merged back and included in the API call */
    updatedPolicy: NewPackagePolicy;
  }) => void;
  validate: Record<DataStream, Validation>;
}

export const useUpdatePolicy = ({ defaultConfig, newPolicy, onChange, validate }: Props) => {
  const [updatedPolicy, setUpdatedPolicy] = useState<NewPackagePolicy>(newPolicy);
  // Update the integration policy with our custom fields
  const [config, setConfig] = useState<Config>(defaultConfig);
  const currentConfig = useRef<Config>(defaultConfig);

  useEffect(() => {
    const { type } = config;
    const configKeys = Object.keys(config) as ConfigKeys[];
    const validationKeys = Object.keys(validate[type]) as ConfigKeys[];
    const configDidUpdate = configKeys.some((key) => config[key] !== currentConfig.current[key]);
    const isValid =
      !!newPolicy.name && !validationKeys.find((key) => validate[type][key]?.(config[key]));
    const formattedPolicy = { ...newPolicy };
    const currentInput = formattedPolicy.inputs.find(
      (input) => input.type === `synthetics/${type}`
    );
    const dataStream = currentInput?.streams[0];

    // prevent an infinite loop of updating the policy
    if (currentInput && dataStream && configDidUpdate) {
      // reset all data streams to enabled false
      formattedPolicy.inputs.forEach((input) => (input.enabled = false));
      // enable only the input type and data stream that matches the monitor type.
      currentInput.enabled = true;
      dataStream.enabled = true;
      configKeys.forEach((key) => {
        const configItem = dataStream.vars?.[key];
        if (configItem) {
          switch (key) {
            case ConfigKeys.SCHEDULE:
              configItem.value = JSON.stringify(`@every ${config[key].number}${config[key].unit}`); // convert to cron
              break;
            case ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE:
            case ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE:
            case ConfigKeys.RESPONSE_HEADERS_CHECK:
            case ConfigKeys.RESPONSE_RECEIVE_CHECK:
            case ConfigKeys.RESPONSE_STATUS_CHECK:
            case ConfigKeys.REQUEST_HEADERS_CHECK:
            case ConfigKeys.TAGS:
              configItem.value = JSON.stringify(config[key]); // convert to yaml string
              break;
            case ConfigKeys.WAIT:
              configItem.value = config[key] ? `${config[key]}s` : null; // convert to cron
              break;
            case ConfigKeys.REQUEST_BODY_CHECK:
              configItem.value = JSON.stringify(config[key].value); // only need value of REQUEST_BODY_CHECK for outputted policy
              break;
            default:
              configItem.value =
                config[key] === undefined || config[key] === null ? null : config[key];
          }
        }
      });
      currentConfig.current = config;
      setUpdatedPolicy(formattedPolicy);
      onChange({
        isValid,
        updatedPolicy: formattedPolicy,
      });
    }
  }, [config, currentConfig, newPolicy, onChange, validate]);

  // update our local config state ever time name, which is managed by fleet, changes
  useEffect(() => {
    setConfig((prevConfig) => ({ ...prevConfig, name: newPolicy.name }));
  }, [newPolicy.name, setConfig]);

  return {
    config,
    setConfig,
    updatedPolicy,
  };
};
