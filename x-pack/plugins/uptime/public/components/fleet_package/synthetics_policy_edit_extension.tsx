/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import {
  PackagePolicyEditExtensionComponentProps,
  NewPackagePolicy,
} from '../../../../fleet/public';
import { Config, ConfigKeys, ICustomFields } from './types';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './use_update_policy';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyEditExtension = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy: currentPolicy, newPolicy, onChange }) => {
    const getDefaultConfig = (policy: NewPackagePolicy) => {
      const vars = policy.inputs[0]?.streams[0]?.vars;
      let configKeys: ConfigKeys[] = [];
      if (vars) {
        configKeys = Object.keys(vars) as ConfigKeys[];
      }
      const defaultConfig = configKeys.reduce((acc: Record<string, unknown>, key: ConfigKeys) => {
        switch (key) {
          case ConfigKeys.NAME:
            acc[key] = currentPolicy.name;
            break;
          case ConfigKeys.TAGS:
            acc[key] = JSON.parse(vars?.[key]?.value);
            break;
          default:
            acc[key] = vars?.[key]?.value;
        }
        return acc;
      }, {});

      return (defaultConfig as unknown) as Config;
    };

    const defaultConfig = getDefaultConfig(currentPolicy);
    const { setConfig } = useUpdatePolicy({ defaultConfig, newPolicy, onChange });

    const handleInputChange = useCallback(
      (fields: ICustomFields) => {
        setConfig((prevConfig) => ({ ...prevConfig, ...fields }));
      },
      [setConfig]
    );

    return <CustomFields defaultValues={defaultConfig} onChange={handleInputChange} />;
  }
);
SyntheticsPolicyEditExtension.displayName = 'SyntheticsPolicyEditExtension';
