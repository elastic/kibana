/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ConfigKey, TLSFields } from '../../../../common/runtime_types';
import {
  tlsArrayToYamlFormatter,
  tlsValueToStringFormatter,
  tlsValueToYamlFormatter,
} from './formatting_utils';
import { Formatter } from './common_formatters';

type TLSFormatMap = Record<keyof TLSFields, Formatter>;

export const tlsFormatters: TLSFormatMap = {
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: tlsValueToYamlFormatter,
  [ConfigKey.TLS_CERTIFICATE]: tlsValueToYamlFormatter,
  [ConfigKey.TLS_KEY]: tlsValueToYamlFormatter,
  [ConfigKey.TLS_KEY_PASSPHRASE]: tlsValueToStringFormatter,
  [ConfigKey.TLS_VERIFICATION_MODE]: tlsValueToStringFormatter,
  [ConfigKey.TLS_VERSION]: tlsArrayToYamlFormatter,
};
