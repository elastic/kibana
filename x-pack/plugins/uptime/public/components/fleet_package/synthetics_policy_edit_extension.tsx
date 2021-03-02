/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { PackagePolicyEditExtensionComponentProps } from '../../../../fleet/public';
import { ConfigKeys, ICustomFields } from './types';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './use_update_policy';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyEditExtension = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy: currentPolicy, newPolicy, onChange }) => {
    const defaultConfig = {
      [ConfigKeys.NAME]: currentPolicy.name,
      [ConfigKeys.URLS]: currentPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.URLS].value,
      [ConfigKeys.SCHEDULE]: currentPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.SCHEDULE].value,
      [ConfigKeys.MONITOR_TYPE]:
        currentPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.MONITOR_TYPE].value,
      [ConfigKeys.MAX_REDIRECTS]:
        currentPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.MAX_REDIRECTS].value,
      [ConfigKeys.PROXY_URL]:
        currentPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.PROXY_URL].value,
      [ConfigKeys.SERVICE_NAME]:
        currentPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.SERVICE_NAME].value,
      [ConfigKeys.TIMEOUT]:
        currentPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.SERVICE_NAME].value,
      [ConfigKeys.TAGS]: currentPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.SERVICE_NAME].value,
      [ConfigKeys.PORTS]: currentPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.PORTS].value,
      [ConfigKeys.HOSTS]: currentPolicy.inputs[0]?.streams[0]?.vars?.[ConfigKeys.HOSTS].value,
    };
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
