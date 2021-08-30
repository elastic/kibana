/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ITLSFields, ConfigKeys } from '../types';
import { Formatter } from '../common/formatters';

type TLSFormatMap = Record<keyof ITLSFields, Formatter>;

export const tlsFormatters: TLSFormatMap = {
  [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: (fields) =>
    tlsValueToYamlFormatter(fields[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]),
  [ConfigKeys.TLS_CERTIFICATE]: (fields) =>
    tlsValueToYamlFormatter(fields[ConfigKeys.TLS_CERTIFICATE]),
  [ConfigKeys.TLS_KEY]: (fields) => tlsValueToYamlFormatter(fields[ConfigKeys.TLS_KEY]),
  [ConfigKeys.TLS_KEY_PASSPHRASE]: (fields) =>
    tlsValueToStringFormatter(fields[ConfigKeys.TLS_KEY_PASSPHRASE]),
  [ConfigKeys.TLS_VERIFICATION_MODE]: (fields) =>
    tlsValueToStringFormatter(fields[ConfigKeys.TLS_VERIFICATION_MODE]),
  [ConfigKeys.TLS_VERSION]: (fields) => tlsArrayToYamlFormatter(fields[ConfigKeys.TLS_VERSION]),
};

// only add tls settings if they are enabled by the user and isEnabled is true
export const tlsValueToYamlFormatter = (tlsValue: { value?: string; isEnabled?: boolean } = {}) =>
  tlsValue.isEnabled && tlsValue.value ? JSON.stringify(tlsValue.value) : null;

export const tlsValueToStringFormatter = (tlsValue: { value?: string; isEnabled?: boolean } = {}) =>
  tlsValue.isEnabled && tlsValue.value ? tlsValue.value : null;

export const tlsArrayToYamlFormatter = (tlsValue: { value?: string[]; isEnabled?: boolean } = {}) =>
  tlsValue.isEnabled && tlsValue.value?.length ? JSON.stringify(tlsValue.value) : null;
