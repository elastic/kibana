/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TLSFields, ConfigKey, VerificationMode, TLSVersion } from '../types';

export const defaultValues: TLSFields = {
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: '',
  [ConfigKey.TLS_CERTIFICATE]: '',
  [ConfigKey.TLS_KEY]: '',
  [ConfigKey.TLS_KEY_PASSPHRASE]: '',
  [ConfigKey.TLS_VERIFICATION_MODE]: VerificationMode.FULL,
  [ConfigKey.TLS_VERSION]: [TLSVersion.ONE_ONE, TLSVersion.ONE_TWO, TLSVersion.ONE_THREE],
};
