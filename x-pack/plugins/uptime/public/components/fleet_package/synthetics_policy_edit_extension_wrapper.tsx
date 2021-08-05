/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { PackagePolicyEditExtensionComponentProps } from '../../../../fleet/public';
import { PolicyConfig, ConfigKeys, DataStream, ITLSFields, ICustomFields } from './types';
import { SyntheticsPolicyEditExtension } from './synthetics_policy_edit_extension';
import {
  MonitorTypeContextProvider,
  HTTPContextProvider,
  TCPContextProvider,
  ICMPSimpleFieldsContextProvider,
  BrowserSimpleFieldsContextProvider,
  TLSFieldsContextProvider,
} from './contexts';
import { normalizers } from './helpers/normalizers';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyEditExtensionWrapper = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy: currentPolicy, newPolicy, onChange }) => {
    const {
      enableTLS: isTLSEnabled,
      fullConfig: fullDefaultConfig,
      monitorTypeConfig: defaultConfig,
      monitorType,
      tlsConfig: defaultTLSConfig,
    } = useMemo(() => {
      let enableTLS = false;
      const getDefaultConfig = () => {
        // find the enabled input to identify the current monitor type
        const currentInput = currentPolicy.inputs.find((input) => input.enabled === true);
        const vars = currentInput?.streams[0]?.vars;
        const type: DataStream = vars?.[ConfigKeys.MONITOR_TYPE].value as DataStream;

        const configKeys: ConfigKeys[] = Object.values(ConfigKeys);
        const formattedDefaultConfigForMonitorType: ICustomFields = configKeys.reduce(
          (acc, key: ConfigKeys) => {
            acc[key] = normalizers[key]?.(vars);
            return acc;
          },
          {} as ICustomFields
        );

        const tlsConfig: ITLSFields = {
          [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]:
            formattedDefaultConfigForMonitorType[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES],
          [ConfigKeys.TLS_CERTIFICATE]:
            formattedDefaultConfigForMonitorType[ConfigKeys.TLS_CERTIFICATE],
          [ConfigKeys.TLS_KEY]: formattedDefaultConfigForMonitorType[ConfigKeys.TLS_KEY],
          [ConfigKeys.TLS_KEY_PASSPHRASE]:
            formattedDefaultConfigForMonitorType[ConfigKeys.TLS_KEY_PASSPHRASE],
          [ConfigKeys.TLS_VERIFICATION_MODE]:
            formattedDefaultConfigForMonitorType[ConfigKeys.TLS_VERIFICATION_MODE],
          [ConfigKeys.TLS_VERSION]: formattedDefaultConfigForMonitorType[ConfigKeys.TLS_VERSION],
        };

        enableTLS = Object.values(tlsConfig).some((value) => value?.isEnabled);

        const formattedDefaultConfig: Partial<PolicyConfig> = {
          [type]: formattedDefaultConfigForMonitorType,
        };

        return {
          fullConfig: formattedDefaultConfig,
          monitorTypeConfig: formattedDefaultConfigForMonitorType,
          tlsConfig,
          enableTLS,
          monitorType: type,
        };
      };

      return getDefaultConfig();
    }, [currentPolicy]);

    return (
      <MonitorTypeContextProvider defaultValue={monitorType}>
        <TLSFieldsContextProvider defaultValues={isTLSEnabled ? defaultTLSConfig : undefined}>
          <HTTPContextProvider defaultValues={fullDefaultConfig?.[DataStream.HTTP]}>
            <TCPContextProvider defaultValues={fullDefaultConfig?.[DataStream.TCP]}>
              <ICMPSimpleFieldsContextProvider defaultValues={fullDefaultConfig?.[DataStream.ICMP]}>
                <BrowserSimpleFieldsContextProvider
                  defaultValues={fullDefaultConfig?.[DataStream.BROWSER]}
                >
                  <SyntheticsPolicyEditExtension
                    newPolicy={newPolicy}
                    onChange={onChange}
                    defaultConfig={defaultConfig}
                    isTLSEnabled={isTLSEnabled}
                  />
                </BrowserSimpleFieldsContextProvider>
              </ICMPSimpleFieldsContextProvider>
            </TCPContextProvider>
          </HTTPContextProvider>
        </TLSFieldsContextProvider>
      </MonitorTypeContextProvider>
    );
  }
);
SyntheticsPolicyEditExtensionWrapper.displayName = 'SyntheticsPolicyEditExtensionWrapper';
