/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { PackagePolicyEditExtensionComponentProps } from '@kbn/fleet-plugin/public';
import { PolicyConfig, MonitorFields } from './types';
import { ConfigKey, DataStream, TLSFields } from './types';
import { SyntheticsPolicyEditExtension } from './synthetics_policy_edit_extension';
import {
  PolicyConfigContextProvider,
  HTTPContextProvider,
  TCPContextProvider,
  ICMPSimpleFieldsContextProvider,
  BrowserContextProvider,
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
      enableZipUrlTLS: isZipUrlTLSEnabled,
      fullConfig: fullDefaultConfig,
      monitorTypeConfig: defaultConfig,
      monitorType,
      tlsConfig: defaultTLSConfig,
    } = useMemo(() => {
      let enableTLS = false;
      let enableZipUrlTLS = false;
      const getDefaultConfig = () => {
        // find the enabled input to identify the current monitor type
        const currentInput = currentPolicy.inputs.find((input) => input.enabled === true);
        /* Inputs can have multiple data streams. This is true of the `synthetics/browser` input, which includes the browser.network and browser.screenshot
         * data streams. The `browser.network` and `browser.screenshot` data streams are used to store metadata and mappings.
         * However, the `browser` data stream is where the variables for the policy are stored. For this reason, we only want
         * to grab the data stream that exists within our explicitly defined list, which is the browser data stream */
        const vars = currentInput?.streams.find((stream) =>
          Object.values(DataStream).includes(stream.data_stream.dataset as DataStream)
        )?.vars;

        const type: DataStream = vars?.[ConfigKey.MONITOR_TYPE].value as DataStream;

        const configKeys: ConfigKey[] = Object.values(ConfigKey) || ([] as ConfigKey[]);
        const formattedDefaultConfigForMonitorType: MonitorFields =
          configKeys.reduce<MonitorFields>((acc: MonitorFields, key: ConfigKey) => {
            return {
              ...acc,
              [key]: normalizers[key]?.(vars),
            };
          }, {} as MonitorFields);

        const tlsConfig: TLSFields = {
          [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]:
            formattedDefaultConfigForMonitorType[ConfigKey.TLS_CERTIFICATE_AUTHORITIES],
          [ConfigKey.TLS_CERTIFICATE]:
            formattedDefaultConfigForMonitorType[ConfigKey.TLS_CERTIFICATE],
          [ConfigKey.TLS_KEY]: formattedDefaultConfigForMonitorType[ConfigKey.TLS_KEY],
          [ConfigKey.TLS_KEY_PASSPHRASE]:
            formattedDefaultConfigForMonitorType[ConfigKey.TLS_KEY_PASSPHRASE],
          [ConfigKey.TLS_VERIFICATION_MODE]:
            formattedDefaultConfigForMonitorType[ConfigKey.TLS_VERIFICATION_MODE],
          [ConfigKey.TLS_VERSION]: formattedDefaultConfigForMonitorType[ConfigKey.TLS_VERSION],
        };

        enableTLS =
          formattedDefaultConfigForMonitorType[ConfigKey.METADATA].is_tls_enabled ||
          Boolean(vars?.[ConfigKey.TLS_VERIFICATION_MODE]?.value);
        enableZipUrlTLS =
          formattedDefaultConfigForMonitorType[ConfigKey.METADATA].is_zip_url_tls_enabled ||
          Boolean(vars?.[ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]?.value);

        const formattedDefaultConfig: Partial<PolicyConfig> = {
          [type]: formattedDefaultConfigForMonitorType,
        };

        return {
          fullConfig: formattedDefaultConfig,
          monitorTypeConfig: formattedDefaultConfigForMonitorType,
          tlsConfig,
          monitorType: type,
          enableTLS,
          enableZipUrlTLS,
        };
      };

      return getDefaultConfig();
    }, [currentPolicy]);

    return (
      <PolicyConfigContextProvider
        defaultMonitorType={monitorType}
        defaultIsTLSEnabled={isTLSEnabled}
        defaultIsZipUrlTLSEnabled={isZipUrlTLSEnabled}
        isEditable={true}
      >
        <TLSFieldsContextProvider defaultValues={isTLSEnabled ? defaultTLSConfig : undefined}>
          <HTTPContextProvider defaultValues={fullDefaultConfig?.[DataStream.HTTP]}>
            <TCPContextProvider defaultValues={fullDefaultConfig?.[DataStream.TCP]}>
              <ICMPSimpleFieldsContextProvider defaultValues={fullDefaultConfig?.[DataStream.ICMP]}>
                <BrowserContextProvider defaultValues={fullDefaultConfig?.[DataStream.BROWSER]}>
                  <SyntheticsPolicyEditExtension
                    newPolicy={newPolicy}
                    onChange={onChange}
                    defaultConfig={defaultConfig}
                  />
                </BrowserContextProvider>
              </ICMPSimpleFieldsContextProvider>
            </TCPContextProvider>
          </HTTPContextProvider>
        </TLSFieldsContextProvider>
      </PolicyConfigContextProvider>
    );
  }
);
SyntheticsPolicyEditExtensionWrapper.displayName = 'SyntheticsPolicyEditExtensionWrapper';
