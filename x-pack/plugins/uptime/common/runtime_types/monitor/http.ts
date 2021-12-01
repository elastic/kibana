/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { CommonFieldsCodec } from './common_ields';
import { ConfigKey } from './config_key';
import { DataStream, ModeCodec, ResponseBodyIndexPolicyCodec } from './monitor_configs';
import { MetadataCodec } from './monitor_meta_data';
import { TLSFieldsCodec } from './tls_fields';

// HTTPSimpleFields
export const HTTPSimpleFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.METADATA]: MetadataCodec,
    [ConfigKey.MAX_REDIRECTS]: t.string,
    [ConfigKey.URLS]: t.string,
  }),
  CommonFieldsCodec,
  t.interface({
    [ConfigKey.MONITOR_TYPE]: t.literal(DataStream.HTTP),
  }),
]);

export type HTTPSimpleFields = t.TypeOf<typeof HTTPSimpleFieldsCodec>;

// HTTPAdvancedFields
export const HTTPAdvancedFieldsCodec = t.interface({
  [ConfigKey.PASSWORD]: t.string,
  [ConfigKey.PROXY_URL]: t.string,
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: t.array(t.string),
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: t.array(t.string),
  [ConfigKey.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicyCodec,
  [ConfigKey.RESPONSE_HEADERS_CHECK]: t.record(t.string, t.string),
  [ConfigKey.RESPONSE_HEADERS_INDEX]: t.boolean,
  [ConfigKey.RESPONSE_STATUS_CHECK]: t.array(t.string),
  [ConfigKey.REQUEST_BODY_CHECK]: t.interface({ value: t.string, type: ModeCodec }),
  [ConfigKey.REQUEST_HEADERS_CHECK]: t.record(t.string, t.string),
  [ConfigKey.REQUEST_METHOD_CHECK]: t.string,
  [ConfigKey.USERNAME]: t.string,
});

export type HTTPAdvancedFields = t.TypeOf<typeof HTTPAdvancedFieldsCodec>;

// HTTPFields
export const HTTPFieldsCodec = t.intersection([
  HTTPSimpleFieldsCodec,
  HTTPAdvancedFieldsCodec,
  TLSFieldsCodec,
]);
export type HTTPFields = t.TypeOf<typeof HTTPFieldsCodec>;
