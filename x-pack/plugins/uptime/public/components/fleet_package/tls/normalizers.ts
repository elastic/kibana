/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ITLSFields, ConfigKeys } from '../types';
import { Normalizer } from '../common/normalizers';
import { defaultTLSFields } from '../contexts';

type TLSNormalizerMap = Record<keyof ITLSFields, Normalizer>;

export const tlsNormalizers: TLSNormalizerMap = {
  [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: (fields) =>
    tlsYamlToObjectNormalizer(
      fields?.[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]?.value,
      ConfigKeys.TLS_CERTIFICATE_AUTHORITIES
    ),
  [ConfigKeys.TLS_CERTIFICATE]: (fields) =>
    tlsYamlToObjectNormalizer(
      fields?.[ConfigKeys.TLS_CERTIFICATE]?.value,
      ConfigKeys.TLS_CERTIFICATE
    ),
  [ConfigKeys.TLS_KEY]: (fields) =>
    tlsYamlToObjectNormalizer(fields?.[ConfigKeys.TLS_KEY]?.value, ConfigKeys.TLS_KEY),
  [ConfigKeys.TLS_KEY_PASSPHRASE]: (fields) =>
    tlsStringToObjectNormalizer(
      fields?.[ConfigKeys.TLS_KEY_PASSPHRASE]?.value,
      ConfigKeys.TLS_KEY_PASSPHRASE
    ),
  [ConfigKeys.TLS_VERIFICATION_MODE]: (fields) =>
    tlsStringToObjectNormalizer(
      fields?.[ConfigKeys.TLS_VERIFICATION_MODE]?.value,
      ConfigKeys.TLS_VERIFICATION_MODE
    ),
  [ConfigKeys.TLS_VERSION]: (fields) =>
    tlsYamlToObjectNormalizer(fields?.[ConfigKeys.TLS_VERSION]?.value, ConfigKeys.TLS_VERSION),
};

// only add tls settings if they are enabled by the user and isEnabled is true
export const tlsStringToObjectNormalizer = (value: string = '', key: keyof ITLSFields) => ({
  value: value ?? defaultTLSFields[key]?.value,
  isEnabled: Boolean(value),
});
export const tlsYamlToObjectNormalizer = (value: string = '', key: keyof ITLSFields) => ({
  value: value ? JSON.parse(value) : defaultTLSFields[key]?.value,
  isEnabled: Boolean(value),
});
