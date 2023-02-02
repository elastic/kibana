/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TLSFields, TLSVersion, ConfigKey } from '../../runtime_types/monitor_management';
import { Formatter } from '../common/formatters';

type TLSFormatMap = Record<keyof TLSFields, Formatter>;

export const tlsFormatters: TLSFormatMap = {
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: (fields) =>
    fields[ConfigKey.METADATA]?.is_tls_enabled
      ? tlsValueToYamlFormatter(fields[ConfigKey.TLS_CERTIFICATE_AUTHORITIES])
      : null,
  [ConfigKey.TLS_CERTIFICATE]: (fields) =>
    fields[ConfigKey.METADATA]?.is_tls_enabled
      ? tlsValueToYamlFormatter(fields[ConfigKey.TLS_CERTIFICATE])
      : null,
  [ConfigKey.TLS_KEY]: (fields) =>
    fields[ConfigKey.METADATA]?.is_tls_enabled
      ? tlsValueToYamlFormatter(fields[ConfigKey.TLS_KEY])
      : null,
  [ConfigKey.TLS_KEY_PASSPHRASE]: (fields) =>
    fields[ConfigKey.METADATA]?.is_tls_enabled
      ? tlsValueToStringFormatter(fields[ConfigKey.TLS_KEY_PASSPHRASE])
      : null,
  [ConfigKey.TLS_VERIFICATION_MODE]: (fields) =>
    fields[ConfigKey.METADATA]?.is_tls_enabled
      ? tlsValueToStringFormatter(fields[ConfigKey.TLS_VERIFICATION_MODE])
      : null,
  [ConfigKey.TLS_VERSION]: (fields) =>
    fields[ConfigKey.METADATA]?.is_tls_enabled
      ? tlsArrayToYamlFormatter(fields[ConfigKey.TLS_VERSION])
      : null,
};

// only add tls settings if they are enabled by the user and isEnabled is true
export const tlsValueToYamlFormatter = (tlsValue: string | null = '') =>
  tlsValue ? JSON.stringify(tlsValue) : null;

export const tlsValueToStringFormatter = (tlsValue: string | null = '') => tlsValue || null;

export const tlsArrayToYamlFormatter = (tlsValue: TLSVersion[] | null = []) =>
  tlsValue?.length ? JSON.stringify(tlsValue) : null;
