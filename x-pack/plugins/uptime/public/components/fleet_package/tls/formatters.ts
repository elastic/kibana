/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TLSFields, ConfigKey } from '../types';
import { Formatter } from '../common/formatters';

type TLSFormatMap = Record<keyof TLSFields, Formatter>;

export const tlsFormatters: TLSFormatMap = {
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: (fields) =>
    tlsValueToYamlFormatter(fields[ConfigKey.TLS_CERTIFICATE_AUTHORITIES]),
  [ConfigKey.TLS_CERTIFICATE]: (fields) =>
    tlsValueToYamlFormatter(fields[ConfigKey.TLS_CERTIFICATE]),
  [ConfigKey.TLS_KEY]: (fields) => tlsValueToYamlFormatter(fields[ConfigKey.TLS_KEY]),
  [ConfigKey.TLS_KEY_PASSPHRASE]: (fields) =>
    tlsValueToStringFormatter(fields[ConfigKey.TLS_KEY_PASSPHRASE]),
  [ConfigKey.TLS_VERIFICATION_MODE]: (fields) =>
    tlsValueToStringFormatter(fields[ConfigKey.TLS_VERIFICATION_MODE]),
  [ConfigKey.TLS_VERSION]: (fields) => tlsArrayToYamlFormatter(fields[ConfigKey.TLS_VERSION]),
};

// only add tls settings if they are enabled by the user and isEnabled is true
export const tlsValueToYamlFormatter = (tlsValue: string = '') =>
  tlsValue ? JSON.stringify(tlsValue) : null;

export const tlsValueToStringFormatter = (tlsValue: string = '') => tlsValue || null;

export const tlsArrayToYamlFormatter = (tlsValue: string[] = []) =>
  tlsValue.length ? JSON.stringify(tlsValue) : null;
