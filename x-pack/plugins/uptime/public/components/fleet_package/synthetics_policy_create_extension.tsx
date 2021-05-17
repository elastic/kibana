/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useContext, useEffect } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { PackagePolicyCreateExtensionComponentProps } from '../../../../fleet/public';
import { useTrackPageview } from '../../../../observability/public';
import { Config, ConfigKeys, DataStream } from './types';
import {
  SimpleFieldsContext,
  HTTPAdvancedFieldsContext,
  TCPAdvancedFieldsContext,
  TLSFieldsContext,
} from './contexts';
import { CustomFields } from './custom_fields';
import { useUpdatePolicy } from './use_update_policy';
import { validate } from './validation';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    const { fields: simpleFields } = useContext(SimpleFieldsContext);
    const { fields: httpAdvancedFields } = useContext(HTTPAdvancedFieldsContext);
    const { fields: tcpAdvancedFields } = useContext(TCPAdvancedFieldsContext);
    const { fields: tlsFields } = useContext(TLSFieldsContext);
    const defaultConfig: Config = {
      name: '',
      ...simpleFields,
      ...httpAdvancedFields,
      ...tcpAdvancedFields,
      ...tlsFields,
    };
    useTrackPageview({ app: 'fleet', path: 'syntheticsCreate' });
    useTrackPageview({ app: 'fleet', path: 'syntheticsCreate', delay: 15000 });
    const { config, setConfig } = useUpdatePolicy({ defaultConfig, newPolicy, onChange, validate });

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

    return <CustomFields typeEditable validate={validate[config[ConfigKeys.MONITOR_TYPE]]} />;
  }
);
SyntheticsPolicyCreateExtension.displayName = 'SyntheticsPolicyCreateExtension';
