/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { PackagePolicyEditExtensionComponentProps } from '../../../../fleet/public';
import { Config, ConfigKeys, ICustomFields, contentTypesToMode, ContentType } from './types';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './use_update_policy';
import { defaultConfig as fallbackConfig } from './synthetics_policy_create_extension';
import { validate } from './validation';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */
export const SyntheticsPolicyEditExtension = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy: currentPolicy, newPolicy, onChange }) => {
    const defaultConfig = useMemo(() => {
      const getDefaultConfig = () => {
        const currentInput = currentPolicy.inputs.find((input) => input.enabled === true);
        const vars = currentInput?.streams[0]?.vars;

        const configKeys: ConfigKeys[] = Object.values(ConfigKeys);
        const formattedDefaultConfig = configKeys.reduce(
          (acc: Record<string, unknown>, key: ConfigKeys) => {
            const value = vars?.[key]?.value;
            switch (key) {
              case ConfigKeys.NAME:
                acc[key] = currentPolicy.name;
                break;
              case ConfigKeys.SCHEDULE:
                // split unit and number
                if (value) {
                  const fullString = JSON.parse(value);
                  const fullSchedule = fullString.replace('@every ', '');
                  const unit = fullSchedule.slice(-1);
                  const number = fullSchedule.slice(0, fullSchedule.length - 1);
                  acc[key] = {
                    unit,
                    number,
                  };
                } else {
                  acc[key] = fallbackConfig[key];
                }
                break;
              case ConfigKeys.WAIT:
                acc[key] = value ? value.slice(0, value.length - 1) : fallbackConfig[key]; // remove unit
                break;
              case ConfigKeys.TAGS:
              case ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE:
              case ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE:
              case ConfigKeys.RESPONSE_RECEIVE_CHECK:
              case ConfigKeys.RESPONSE_STATUS_CHECK:
              case ConfigKeys.RESPONSE_HEADERS_CHECK:
              case ConfigKeys.REQUEST_HEADERS_CHECK:
                acc[key] = value ? JSON.parse(value) : fallbackConfig[key];
                break;
              case ConfigKeys.REQUEST_BODY_CHECK:
                const headers = value
                  ? JSON.parse(vars?.[ConfigKeys.REQUEST_HEADERS_CHECK].value)
                  : fallbackConfig[ConfigKeys.REQUEST_HEADERS_CHECK];
                const requestBodyValue =
                  value !== null && value !== undefined
                    ? JSON.parse(value)
                    : fallbackConfig[key].value;
                let type;
                Object.keys(headers || []).map((headerKey) => {
                  if (
                    headerKey === 'Content-Type' &&
                    contentTypesToMode[headers[headerKey] as ContentType]
                  ) {
                    type = contentTypesToMode[headers[headerKey] as ContentType];
                  } else {
                    type = fallbackConfig[key].type;
                  }
                });
                acc[key] = {
                  value: requestBodyValue,
                  type,
                };
                break;
              default:
                acc[key] = value ?? fallbackConfig[key];
            }
            return acc;
          },
          {}
        );

        return (formattedDefaultConfig as unknown) as Config;
      };

      return getDefaultConfig();
    }, [currentPolicy]);
    const { config, setConfig } = useUpdatePolicy({ defaultConfig, newPolicy, onChange, validate });

    const handleInputChange = useCallback(
      (fields: ICustomFields) => {
        setConfig((prevConfig) => ({ ...prevConfig, ...fields }));
      },
      [setConfig]
    );

    return (
      <CustomFields
        defaultValues={defaultConfig}
        onChange={handleInputChange}
        validate={validate[config[ConfigKeys.MONITOR_TYPE]]}
      />
    );
  }
);
SyntheticsPolicyEditExtension.displayName = 'SyntheticsPolicyEditExtension';
