/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useContext } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { PackagePolicyEditExtensionComponentProps } from '../../../../fleet/public';
import { useTrackPageview } from '../../../../observability/public';
import {
  SimpleFieldsContext,
  HTTPAdvancedFieldsContext,
  TCPAdvancedFieldsContext,
  TLSFieldsContext,
} from './contexts';
import { Config, ConfigKeys, DataStream } from './types';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './use_update_policy';
import { validate } from './validation';

interface SyntheticsPolicyEditExtensionProps {
  newPolicy: PackagePolicyEditExtensionComponentProps['newPolicy'];
  onChange: PackagePolicyEditExtensionComponentProps['onChange'];
  defaultConfig: Config;
  isTLSEnabled: boolean;
}
/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */
export const SyntheticsPolicyEditExtension = memo<SyntheticsPolicyEditExtensionProps>(
  ({ newPolicy, onChange, defaultConfig, isTLSEnabled }) => {
    useTrackPageview({ app: 'fleet', path: 'syntheticsEdit' });
    useTrackPageview({ app: 'fleet', path: 'syntheticsEdit', delay: 15000 });
    const { fields: simpleFields } = useContext(SimpleFieldsContext);
    const { fields: httpAdvancedFields } = useContext(HTTPAdvancedFieldsContext);
    const { fields: tcpAdvancedFields } = useContext(TCPAdvancedFieldsContext);
    const { fields: tlsFields } = useContext(TLSFieldsContext);
    const { config, setConfig } = useUpdatePolicy({ defaultConfig, newPolicy, onChange, validate });

    useDebounce(
      () => {
        setConfig((prevConfig) => ({
          ...prevConfig,
          ...simpleFields,
          ...httpAdvancedFields,
          ...tcpAdvancedFields,
          ...tlsFields,
          // ensure proxyUrl is not overwritten
          [ConfigKeys.PROXY_URL]:
            simpleFields[ConfigKeys.MONITOR_TYPE] === DataStream.HTTP
              ? httpAdvancedFields[ConfigKeys.PROXY_URL]
              : tcpAdvancedFields[ConfigKeys.PROXY_URL],
        }));
      },
      250,
      [setConfig, simpleFields, httpAdvancedFields, tcpAdvancedFields, tlsFields]
    );

    return (
      <CustomFields
        isTLSEnabled={isTLSEnabled}
        validate={validate[config[ConfigKeys.MONITOR_TYPE]]}
      />
    );
  }
);
SyntheticsPolicyEditExtension.displayName = 'SyntheticsPolicyEditExtension';
