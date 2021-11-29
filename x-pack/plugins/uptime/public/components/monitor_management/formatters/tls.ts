/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ITLSFields, ConfigKeys } from '../../fleet_package/types';
import { arrayFormatter, Formatter } from './common';

type TLSFormatMap = Record<keyof ITLSFields, Formatter>;

export const tlsFormatters: TLSFormatMap = {
  [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: null,
  [ConfigKeys.TLS_CERTIFICATE]: null,
  [ConfigKeys.TLS_KEY]: null,
  [ConfigKeys.TLS_KEY_PASSPHRASE]: null,
  [ConfigKeys.TLS_VERIFICATION_MODE]: null,
  [ConfigKeys.TLS_VERSION]: (fields) => arrayFormatter(fields[ConfigKeys.TLS_VERSION]),
};
