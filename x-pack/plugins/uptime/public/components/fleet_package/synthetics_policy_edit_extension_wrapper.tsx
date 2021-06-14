/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { PackagePolicyEditExtensionComponentProps } from '../../../../fleet/public';
import {
  PolicyConfig,
  ConfigKeys,
  ContentType,
  DataStream,
  ICustomFields,
  contentTypesToMode,
} from './types';
import { SyntheticsPolicyEditExtension } from './synthetics_policy_edit_extension';
import {
  MonitorTypeContextProvider,
  HTTPContextProvider,
  TCPContextProvider,
  defaultTCPSimpleFields,
  defaultHTTPSimpleFields,
  defaultICMPSimpleFields,
  defaultHTTPAdvancedFields,
  defaultTCPAdvancedFields,
  defaultTLSFields,
  ICMPSimpleFieldsContextProvider,
} from './contexts';

/**
 * Exports Synthetics-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const SyntheticsPolicyEditExtensionWrapper = memo<PackagePolicyEditExtensionComponentProps>(
  ({ policy: currentPolicy, newPolicy, onChange }) => {
    const { enableTLS: isTLSEnabled, config: defaultConfig, monitorType } = useMemo(() => {
      const fallbackConfig: PolicyConfig = {
        [DataStream.HTTP]: {
          ...defaultHTTPSimpleFields,
          ...defaultHTTPAdvancedFields,
          ...defaultTLSFields,
        },
        [DataStream.TCP]: {
          ...defaultTCPSimpleFields,
          ...defaultTCPAdvancedFields,
          ...defaultTLSFields,
        },
        [DataStream.ICMP]: defaultICMPSimpleFields,
      };
      let enableTLS = false;
      const getDefaultConfig = () => {
        const currentInput = currentPolicy.inputs.find((input) => input.enabled === true);
        const vars = currentInput?.streams[0]?.vars;
        const type: DataStream = vars?.[ConfigKeys.MONITOR_TYPE].value as DataStream;
        const fallbackConfigForMonitorType = fallbackConfig[type] as Partial<ICustomFields>;

        const configKeys: ConfigKeys[] = Object.values(ConfigKeys);
        const formatttedDefaultConfigForMonitorType = configKeys.reduce(
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
                  acc[key] = fallbackConfigForMonitorType[key];
                }
                break;
              case ConfigKeys.TIMEOUT:
              case ConfigKeys.WAIT:
                acc[key] = value
                  ? value.slice(0, value.length - 1)
                  : fallbackConfigForMonitorType[key]; // remove unit
                break;
              case ConfigKeys.TAGS:
              case ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE:
              case ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE:
              case ConfigKeys.RESPONSE_STATUS_CHECK:
              case ConfigKeys.RESPONSE_HEADERS_CHECK:
              case ConfigKeys.REQUEST_HEADERS_CHECK:
                acc[key] = value ? JSON.parse(value) : fallbackConfigForMonitorType[key];
                break;
              case ConfigKeys.REQUEST_BODY_CHECK:
                const headers = value
                  ? JSON.parse(vars?.[ConfigKeys.REQUEST_HEADERS_CHECK].value)
                  : fallbackConfigForMonitorType[ConfigKeys.REQUEST_HEADERS_CHECK];
                const requestBodyValue =
                  value !== null && value !== undefined
                    ? JSON.parse(value)
                    : fallbackConfigForMonitorType[key]?.value;
                let requestBodyType = fallbackConfigForMonitorType[key]?.type;
                Object.keys(headers || []).some((headerKey) => {
                  if (
                    headerKey === 'Content-Type' &&
                    contentTypesToMode[headers[headerKey] as ContentType]
                  ) {
                    requestBodyType = contentTypesToMode[headers[headerKey] as ContentType];
                    return true;
                  }
                });
                acc[key] = {
                  value: requestBodyValue,
                  type,
                };
                break;
              case ConfigKeys.TLS_KEY_PASSPHRASE:
              case ConfigKeys.TLS_VERIFICATION_MODE:
                acc[key] = {
                  value: value ?? fallbackConfigForMonitorType[key]?.value,
                  isEnabled: !!value,
                };
                if (!!value) {
                  enableTLS = true;
                }
                break;
              case ConfigKeys.TLS_CERTIFICATE:
              case ConfigKeys.TLS_CERTIFICATE_AUTHORITIES:
              case ConfigKeys.TLS_KEY:
              case ConfigKeys.TLS_VERSION:
                acc[key] = {
                  value: value ? JSON.parse(value) : fallbackConfigForMonitorType[key]?.value,
                  isEnabled: !!value,
                };
                if (!!value) {
                  enableTLS = true;
                }
                break;
              default:
                acc[key] = value ?? fallbackConfigForMonitorType[key];
            }
            return acc;
          },
          {}
        );

        const formattedDefaultConfig: PolicyConfig = {
          ...fallbackConfig,
          [type]: formatttedDefaultConfigForMonitorType,
        };

        return { config: formattedDefaultConfig, enableTLS, monitorType: type };
      };

      return getDefaultConfig();
    }, [currentPolicy]);

    // const simpleFields = {
    //   [ConfigKeys.APM_SERVICE_NAME]: defaultConfig[ConfigKeys.APM_SERVICE_NAME],
    //   [ConfigKeys.HOSTS]: defaultConfig[ConfigKeys.HOSTS],
    //   [ConfigKeys.MAX_REDIRECTS]: defaultConfig[ConfigKeys.MAX_REDIRECTS],
    //   [ConfigKeys.MONITOR_TYPE]: defaultConfig[ConfigKeys.MONITOR_TYPE],
    //   [ConfigKeys.SCHEDULE]: defaultConfig[ConfigKeys.SCHEDULE],
    //   [ConfigKeys.TAGS]: defaultConfig[ConfigKeys.TAGS],
    //   [ConfigKeys.TIMEOUT]: defaultConfig[ConfigKeys.TIMEOUT],
    //   [ConfigKeys.URLS]: defaultConfig[ConfigKeys.URLS],
    //   [ConfigKeys.WAIT]: defaultConfig[ConfigKeys.WAIT],
    // };
    // const httpAdvancedFields = {
    //   [ConfigKeys.USERNAME]: defaultConfig[ConfigKeys.USERNAME],
    //   [ConfigKeys.PASSWORD]: defaultConfig[ConfigKeys.PASSWORD],
    //   [ConfigKeys.PROXY_URL]: defaultConfig[ConfigKeys.PROXY_URL],
    //   [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]:
    //     defaultConfig[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE],
    //   [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]:
    //     defaultConfig[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE],
    //   [ConfigKeys.RESPONSE_BODY_INDEX]: defaultConfig[ConfigKeys.RESPONSE_BODY_INDEX],
    //   [ConfigKeys.RESPONSE_HEADERS_CHECK]: defaultConfig[ConfigKeys.RESPONSE_HEADERS_CHECK],
    //   [ConfigKeys.RESPONSE_HEADERS_INDEX]: defaultConfig[ConfigKeys.RESPONSE_HEADERS_INDEX],
    //   [ConfigKeys.RESPONSE_STATUS_CHECK]: defaultConfig[ConfigKeys.RESPONSE_STATUS_CHECK],
    //   [ConfigKeys.REQUEST_BODY_CHECK]: defaultConfig[ConfigKeys.REQUEST_BODY_CHECK],
    //   [ConfigKeys.REQUEST_HEADERS_CHECK]: defaultConfig[ConfigKeys.REQUEST_HEADERS_CHECK],
    //   [ConfigKeys.REQUEST_METHOD_CHECK]: defaultConfig[ConfigKeys.REQUEST_METHOD_CHECK],
    // };
    // const tcpAdvancedFields = {
    //   [ConfigKeys.PROXY_URL]: defaultConfig[ConfigKeys.PROXY_URL],
    //   [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: defaultConfig[ConfigKeys.PROXY_USE_LOCAL_RESOLVER],
    //   [ConfigKeys.RESPONSE_RECEIVE_CHECK]: defaultConfig[ConfigKeys.RESPONSE_RECEIVE_CHECK],
    //   [ConfigKeys.REQUEST_SEND_CHECK]: defaultConfig[ConfigKeys.REQUEST_SEND_CHECK],
    // };
    // const tlsFields = {
    //   [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]:
    //     defaultConfig[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES],
    //   [ConfigKeys.TLS_CERTIFICATE]: defaultConfig[ConfigKeys.TLS_CERTIFICATE],
    //   [ConfigKeys.TLS_KEY]: defaultConfig[ConfigKeys.TLS_KEY],
    //   [ConfigKeys.TLS_KEY_PASSPHRASE]: defaultConfig[ConfigKeys.TLS_KEY_PASSPHRASE],
    //   [ConfigKeys.TLS_VERIFICATION_MODE]: defaultConfig[ConfigKeys.TLS_VERIFICATION_MODE],
    //   [ConfigKeys.TLS_VERSION]: defaultConfig[ConfigKeys.TLS_VERSION],
    // };

    return (
      <MonitorTypeContextProvider defaultValue={monitorType}>
        <HTTPContextProvider defaultValues={defaultConfig[DataStream.HTTP]}>
          <TCPContextProvider defaultValues={defaultConfig[DataStream.TCP]}>
            <ICMPSimpleFieldsContextProvider defaultValues={defaultConfig[DataStream.ICMP]}>
              <SyntheticsPolicyEditExtension
                newPolicy={newPolicy}
                onChange={onChange}
                defaultConfig={defaultConfig}
                isTLSEnabled={isTLSEnabled}
              />
            </ICMPSimpleFieldsContextProvider>
          </TCPContextProvider>
        </HTTPContextProvider>
      </MonitorTypeContextProvider>
    );
  }
);
SyntheticsPolicyEditExtensionWrapper.displayName = 'SyntheticsPolicyEditExtensionWrapper';
