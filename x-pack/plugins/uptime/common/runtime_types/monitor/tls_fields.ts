/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ConfigKey } from './config_key';
import { TLSVersionCodec, VerificationModeCodec } from './monitor_configs';

// TLSFields
export const TLSFieldsCodec = t.partial({
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: t.string,
  [ConfigKey.TLS_CERTIFICATE]: t.string,
  [ConfigKey.TLS_KEY]: t.string,
  [ConfigKey.TLS_KEY_PASSPHRASE]: t.string,
  [ConfigKey.TLS_VERIFICATION_MODE]: VerificationModeCodec,
  [ConfigKey.TLS_VERSION]: t.array(TLSVersionCodec),
});

export type TLSFields = t.TypeOf<typeof TLSFieldsCodec>;

// ZipUrlTLSFields
export const ZipUrlTLSFieldsCodec = t.partial({
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: t.string,
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE]: t.string,
  [ConfigKey.ZIP_URL_TLS_KEY]: t.string,
  [ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE]: t.string,
  [ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]: VerificationModeCodec,
  [ConfigKey.ZIP_URL_TLS_VERSION]: t.array(TLSVersionCodec),
});

export type ZipUrlTLSFields = t.TypeOf<typeof ZipUrlTLSFieldsCodec>;
