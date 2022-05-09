/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TLSFields, ConfigKey } from '../types';
import { Normalizer } from '../common/normalizers';
import { defaultTLSFields } from '../contexts';

type TLSNormalizerMap = Record<keyof TLSFields, Normalizer>;

export const tlsNormalizers: TLSNormalizerMap = {
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: (fields) =>
    tlsJsonToObjectNormalizer(
      fields?.[ConfigKey.TLS_CERTIFICATE_AUTHORITIES]?.value,
      ConfigKey.TLS_CERTIFICATE_AUTHORITIES
    ),
  [ConfigKey.TLS_CERTIFICATE]: (fields) =>
    tlsJsonToObjectNormalizer(
      fields?.[ConfigKey.TLS_CERTIFICATE]?.value,
      ConfigKey.TLS_CERTIFICATE
    ),
  [ConfigKey.TLS_KEY]: (fields) =>
    tlsJsonToObjectNormalizer(fields?.[ConfigKey.TLS_KEY]?.value, ConfigKey.TLS_KEY),
  [ConfigKey.TLS_KEY_PASSPHRASE]: (fields) =>
    tlsStringToObjectNormalizer(
      fields?.[ConfigKey.TLS_KEY_PASSPHRASE]?.value,
      ConfigKey.TLS_KEY_PASSPHRASE
    ),
  [ConfigKey.TLS_VERIFICATION_MODE]: (fields) =>
    tlsStringToObjectNormalizer(
      fields?.[ConfigKey.TLS_VERIFICATION_MODE]?.value,
      ConfigKey.TLS_VERIFICATION_MODE
    ),
  [ConfigKey.TLS_VERSION]: (fields) =>
    tlsJsonToObjectNormalizer(fields?.[ConfigKey.TLS_VERSION]?.value, ConfigKey.TLS_VERSION),
};

export const tlsStringToObjectNormalizer = (value: string = '', key: keyof TLSFields) =>
  value ?? defaultTLSFields[key];
export const tlsJsonToObjectNormalizer = (value: string = '', key: keyof TLSFields) =>
  value ? JSON.parse(value) : defaultTLSFields[key];
