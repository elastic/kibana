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

        let configKeys: ConfigKeys[] = [];
        if (vars) {
          configKeys = Object.keys(vars) as ConfigKeys[];
        }
        const formattedDefaultConfig = configKeys.reduce(
          (acc: Record<string, unknown>, key: ConfigKeys) => {
            const value = vars?.[key]?.value;
            switch (key) {
              case ConfigKeys.NAME:
                acc[key] = currentPolicy.name;
                break;
              case ConfigKeys.SCHEDULE:
                // split unit and number
                const fullString = JSON.parse(value);
                const fullSchedule = fullString.replace('@every ', '');
                const unit = fullSchedule.slice(-1);
                const number = fullSchedule.slice(0, fullSchedule.length - 1);
                acc[key] = {
                  unit,
                  number,
                };
                break;
              case ConfigKeys.WAIT:
                acc[key] = value.slice(0, value.length - 1); // remove unit
                break;
              case ConfigKeys.TAGS:
              case ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE:
              case ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE:
              case ConfigKeys.RESPONSE_RECEIVE_CHECK:
              case ConfigKeys.RESPONSE_STATUS_CHECK:
                acc[key] = JSON.parse(value) || [];
                break;
              case ConfigKeys.RESPONSE_HEADERS_CHECK:
              case ConfigKeys.REQUEST_HEADERS_CHECK:
                acc[key] = JSON.parse(value) || {};
                break;
              case ConfigKeys.REQUEST_BODY_CHECK:
                const headers = JSON.parse(vars?.[ConfigKeys.REQUEST_HEADERS_CHECK].value) || {};
                const requestBodyValue = JSON.parse(value) || '';
                let type;
                Object.keys(headers || []).map((headerKey) => {
                  if (headerKey === 'Content-Type') {
                    type = contentTypesToMode[headers[headerKey] as ContentType];
                  }
                });
                acc[key] = {
                  value: requestBodyValue,
                  type,
                };
                break;
              default:
                acc[key] = value;
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
