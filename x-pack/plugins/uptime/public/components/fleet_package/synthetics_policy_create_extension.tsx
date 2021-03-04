/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect } from 'react';
import { PackagePolicyCreateExtensionComponentProps } from '../../../../fleet/public';
import { Config, ConfigKeys, DataStream, ICustomFields } from './types';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './use_update_policy';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    const { setConfig } = useUpdatePolicy({ defaultConfig, newPolicy, onChange });

    // Fleet will initialize the create form with a default name for the integratin policy, however,
    // for synthetics, we want the user to explicitely type in a name to use as the monitor name,
    // so we blank it out only during 1st component render (thus why the eslint disabled rule below).
    useEffect(() => {
      onChange({
        isValid: false,
        updatedPolicy: {
          ...newPolicy,
          name: '',
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInputChange = useCallback(
      (fields: ICustomFields) => {
        setConfig((prevConfig) => ({ ...prevConfig, ...fields }));
      },
      [setConfig]
    );

    return <CustomFields defaultValues={defaultValues} onChange={handleInputChange} />;
  }
);
SyntheticsPolicyCreateExtension.displayName = 'SyntheticsPolicyCreateExtension';

const defaultValues = {
  [ConfigKeys.PORTS]: '',
  [ConfigKeys.HOSTS]: '',
  [ConfigKeys.MAX_REDIRECTS]: 0,
  [ConfigKeys.MONITOR_TYPE]: DataStream.HTTP,
  [ConfigKeys.PROXY_URL]: '',
  [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: false,
  [ConfigKeys.SCHEDULE]: 5,
  [ConfigKeys.SERVICE_NAME]: '',
  [ConfigKeys.TAGS]: [],
  [ConfigKeys.TIMEOUT]: 1600,
  [ConfigKeys.URLS]: '',
  [ConfigKeys.WAIT]: 1,
};

const defaultConfig: Config = {
  name: '',
  ...defaultValues,
};
