/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { PackagePolicyEditExtensionComponentProps } from '../../../../fleet/public';
import { ICustomFields } from './types';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './use_update_policy';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyEditExtension = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy: currentPolicy, newPolicy, onChange }) => {
    const defaultConfig = {
      name: currentPolicy.name,
      urls: currentPolicy.inputs[0]?.streams[0]?.vars?.urls.value,
      schedule: currentPolicy.inputs[0]?.streams[0]?.vars?.schedule.value,
    };
    const { setConfig } = useUpdatePolicy({ defaultConfig, newPolicy, onChange });

    const handleInputChange = useCallback(
      (fields: ICustomFields) => {
        setConfig((prevConfig) => ({ ...prevConfig, ...fields }));
      },
      [setConfig]
    );

    return (
      <CustomFields
        defaultValues={{ urls: defaultConfig.urls, schedule: defaultConfig.schedule }}
        onChange={handleInputChange}
      />
    );
  }
);
SyntheticsPolicyEditExtension.displayName = 'SyntheticsPolicyEditExtension';
