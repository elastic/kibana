/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useRef, useState } from 'react';
import { NewPackagePolicy } from '../../../../fleet/public';
import { ConfigKeys, Config, DataStream } from './types';

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
    const { type } = config;
    const configKeys = Object.keys(config) as ConfigKeys[]; // all keys for determining if the form has been changed
    const configDidUpdate = configKeys.some((key) => config[key] !== currentConfig.current[key]);
    // TO DO: Update validation
    const isValid =
      !!newPolicy.name && getIsValid({ requiredFieldList: requiredFields[type], input: config });
    const updatedPolicy = { ...newPolicy };
    const currentInput = updatedPolicy.inputs.find((input) => input.type === `synthetics/${type}`);
    const dataStream = currentInput?.streams[0];

    // prevent an infinite loop of updating the policy
    if (currentInput && dataStream && configDidUpdate) {
      // reset all data streams to enabled false
      updatedPolicy.inputs.forEach((input) => (input.enabled = false));
      // enable only the input type and data stream that matches the monitor type.
      currentInput.enabled = true;
      dataStream.enabled = true;
      configKeys.forEach((key) => {
        const configItem = dataStream.vars?.[key];
        if (configItem) {
          switch (key) {
            case ConfigKeys.SCHEDULE:
              configItem.value = JSON.stringify(`@every ${config[key]}s`); // convert to cron
              break;
            case ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE:
            case ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE:
            case ConfigKeys.RESPONSE_HEADERS_CHECK:
            case ConfigKeys.RESPONSE_STATUS_CHECK:
            case ConfigKeys.REQUEST_HEADERS_CHECK:
            case ConfigKeys.TAGS:
              configItem.value = JSON.stringify(config[key]); // convert to yaml string
              break;
            case ConfigKeys.WAIT:
              configItem.value = `${config[key]}s`; // convert to cron
              break;
            case ConfigKeys.REQUEST_BODY_CHECK:
              configItem.value = config[key].value; // only need value of REEQUEST_BODY_CHECK for outputted policy
              break;
            default:
              configItem.value =
                !config[key] && typeof config[key] !== 'boolean' ? null : config[key];
          }
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

const requiredFields = {
  [DataStream.HTTP]: [ConfigKeys.URLS, ConfigKeys.SCHEDULE],
  [DataStream.TCP]: [ConfigKeys.HOSTS, ConfigKeys.SCHEDULE],
  [DataStream.ICMP]: [ConfigKeys.HOSTS, ConfigKeys.SCHEDULE],
};

// also ensure that optional fields are valid when filled in
const getIsValid = ({
  requiredFieldList,
  input,
}: {
  requiredFieldList: ConfigKeys[];
  input: Config;
}) => {
  return !requiredFieldList.some((field) => {
    switch (typeof field) {
      case 'number':
        return input[field] < 1;
      case 'string':
        return !Boolean(input[field]);
    }
  });
};
