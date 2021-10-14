/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ITLSFields, ConfigKeys, VerificationMode, TLSVersion } from '../types';

export const defaultValues: ITLSFields = {
  [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: '',
  [ConfigKeys.TLS_CERTIFICATE]: '',
  [ConfigKeys.TLS_KEY]: '',
  [ConfigKeys.TLS_KEY_PASSPHRASE]: '',
  [ConfigKeys.TLS_VERIFICATION_MODE]: VerificationMode.FULL,
  [ConfigKeys.TLS_VERSION]: [TLSVersion.ONE_ONE, TLSVersion.ONE_TWO, TLSVersion.ONE_THREE],
};
