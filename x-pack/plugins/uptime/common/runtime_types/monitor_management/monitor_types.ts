/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ConfigKey } from './config_key';
import {
  DataStreamCodec,
  ModeCodec,
  ResponseBodyIndexPolicyCodec,
  ScheduleUnitCodec,
} from './monitor_configs';
import { MetadataCodec } from './monitor_meta_data';
import { TLSVersionCodec, VerificationModeCodec } from './monitor_configs';

const Schedule = t.interface({
  number: t.string,
  unit: ScheduleUnitCodec,
});

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

// CommonFields
export const CommonFieldsCodec = t.interface({
  [ConfigKey.MONITOR_TYPE]: DataStreamCodec,
  [ConfigKey.ENABLED]: t.boolean,
  [ConfigKey.SCHEDULE]: Schedule,
  [ConfigKey.APM_SERVICE_NAME]: t.string,
  [ConfigKey.TIMEOUT]: t.string,
  [ConfigKey.TAGS]: t.array(t.string),
});

export type CommonFields = t.TypeOf<typeof CommonFieldsCodec>;

// TCP Simple Fields
export const TCPSimpleFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.METADATA]: MetadataCodec,
    [ConfigKey.HOSTS]: t.string,
  }),
  CommonFieldsCodec,
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

// ICMP SimpleFields
export const ICMPSimpleFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.HOSTS]: t.string,
    [ConfigKey.WAIT]: t.string,
  }),
  CommonFieldsCodec,
]);

export type ICMPSimpleFields = t.TypeOf<typeof ICMPSimpleFieldsCodec>;
export type ICMPFields = t.TypeOf<typeof ICMPSimpleFieldsCodec>;

// HTTPSimpleFields
export const HTTPSimpleFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.METADATA]: MetadataCodec,
    [ConfigKey.MAX_REDIRECTS]: t.string,
    [ConfigKey.URLS]: t.string,
  }),
  CommonFieldsCodec,
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

// Browser Fields
export const ThrottlingConfigKeyCodec = t.union([
  t.literal(ConfigKey.DOWNLOAD_SPEED),
  t.literal(ConfigKey.UPLOAD_SPEED),
  t.literal(ConfigKey.LATENCY),
]);

export type ThrottlingConfigKey = t.TypeOf<typeof ThrottlingConfigKeyCodec>;

export const BrowserSimpleFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.METADATA]: MetadataCodec,
    [ConfigKey.SOURCE_INLINE]: t.string,
    [ConfigKey.SOURCE_ZIP_URL]: t.string,
    [ConfigKey.SOURCE_ZIP_FOLDER]: t.string,
    [ConfigKey.SOURCE_ZIP_USERNAME]: t.string,
    [ConfigKey.SOURCE_ZIP_PASSWORD]: t.string,
    [ConfigKey.SOURCE_ZIP_PROXY_URL]: t.string,
    [ConfigKey.PARAMS]: t.string,
  }),
  ZipUrlTLSFieldsCodec,
  CommonFieldsCodec,
]);

export const BrowserAdvancedFieldsCodec = t.interface({
  [ConfigKey.SYNTHETICS_ARGS]: t.array(t.string),
  [ConfigKey.SCREENSHOTS]: t.string,
  [ConfigKey.JOURNEY_FILTERS_MATCH]: t.string,
  [ConfigKey.JOURNEY_FILTERS_TAGS]: t.array(t.string),
  [ConfigKey.IGNORE_HTTPS_ERRORS]: t.boolean,
  [ConfigKey.IS_THROTTLING_ENABLED]: t.boolean,
  [ConfigKey.DOWNLOAD_SPEED]: t.string,
  [ConfigKey.UPLOAD_SPEED]: t.string,
  [ConfigKey.LATENCY]: t.string,
  [ConfigKey.THROTTLING_CONFIG]: t.string,
});

export const BrowserFieldsCodec = t.intersection([
  BrowserSimpleFieldsCodec,
  BrowserAdvancedFieldsCodec,
]);

export type BrowserFields = t.TypeOf<typeof BrowserFieldsCodec>;
export type BrowserSimpleFields = t.TypeOf<typeof BrowserSimpleFieldsCodec>;
export type BrowserAdvancedFields = t.TypeOf<typeof BrowserAdvancedFieldsCodec>;

export const MonitorFieldsCodec = t.intersection([
  HTTPFieldsCodec,
  TCPFieldsCodec,
  ICMPSimpleFieldsCodec,
  BrowserFieldsCodec,
  t.interface({
    [ConfigKey.NAME]: t.string,
  }),
]);

export type MonitorFields = t.TypeOf<typeof MonitorFieldsCodec>;
