/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TCPSimpleFields
import * as t from 'io-ts';
import { CommonFieldsCodec } from './common_ields';
import { ConfigKey } from './config_key';
import { DataStream } from './monitor_configs';
import { MetadataCodec } from './monitor_meta_data';
import { TLSFieldsCodec } from './tls_fields';

export const TCPSimpleFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.METADATA]: MetadataCodec,
    [ConfigKey.HOSTS]: t.string,
  }),
  CommonFieldsCodec,
  t.interface({
    [ConfigKey.MONITOR_TYPE]: t.literal(DataStream.TCP),
  }),
]);

export type TCPSimpleFields = t.TypeOf<typeof TCPSimpleFieldsCodec>;

// TCPAdvancedFields
export const TCPAdvancedFieldsCodec = t.interface({
  [ConfigKey.PROXY_URL]: t.string,
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: t.boolean,
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: t.string,
  [ConfigKey.REQUEST_SEND_CHECK]: t.string,
});

export type TCPAdvancedFields = t.TypeOf<typeof TCPAdvancedFieldsCodec>;

// TCPFields
export const TCPFieldsCodec = t.intersection([
  TCPSimpleFieldsCodec,
  TCPAdvancedFieldsCodec,
  TLSFieldsCodec,
]);

export type TCPFields = t.TypeOf<typeof TCPFieldsCodec>;
