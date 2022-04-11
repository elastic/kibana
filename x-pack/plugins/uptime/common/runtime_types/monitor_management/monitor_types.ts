/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { secretKeys } from '../../constants/monitor_management';
import { ConfigKey } from './config_key';
import { MonitorServiceLocationsCodec, ServiceLocationErrors } from './locations';
import {
  DataStreamCodec,
  ModeCodec,
  ResponseBodyIndexPolicyCodec,
  ScheduleUnitCodec,
  TLSVersionCodec,
  VerificationModeCodec,
} from './monitor_configs';
import { MetadataCodec } from './monitor_meta_data';

const Schedule = t.interface({
  number: t.string,
  unit: ScheduleUnitCodec,
});

// TLSFields
export const TLSFieldsCodec = t.partial({
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: t.string,
  [ConfigKey.TLS_CERTIFICATE]: t.string,
  [ConfigKey.TLS_VERIFICATION_MODE]: VerificationModeCodec,
  [ConfigKey.TLS_VERSION]: t.array(TLSVersionCodec),
});

export const TLSSensitiveFieldsCodec = t.partial({
  [ConfigKey.TLS_KEY]: t.string,
  [ConfigKey.TLS_KEY_PASSPHRASE]: t.string,
});

export const TLSCodec = t.intersection([TLSFieldsCodec, TLSSensitiveFieldsCodec]);

export type TLSFields = t.TypeOf<typeof TLSCodec>;

// ZipUrlTLSFields
export const ZipUrlTLSFieldsCodec = t.partial({
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: t.string,
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE]: t.string,
  [ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]: VerificationModeCodec,
  [ConfigKey.ZIP_URL_TLS_VERSION]: t.array(TLSVersionCodec),
});

export const ZipUrlTLSSensitiveFieldsCodec = t.partial({
  [ConfigKey.ZIP_URL_TLS_KEY]: t.string,
  [ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE]: t.string,
});

export const ZipUrlTLSCodec = t.intersection([ZipUrlTLSFieldsCodec, ZipUrlTLSSensitiveFieldsCodec]);

export type ZipUrlTLSFields = t.TypeOf<typeof ZipUrlTLSCodec>;

// CommonFields
export const CommonFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.NAME]: t.string,
    [ConfigKey.NAMESPACE]: t.string,
    [ConfigKey.MONITOR_TYPE]: DataStreamCodec,
    [ConfigKey.ENABLED]: t.boolean,
    [ConfigKey.SCHEDULE]: Schedule,
    [ConfigKey.APM_SERVICE_NAME]: t.string,
    [ConfigKey.TAGS]: t.array(t.string),
    [ConfigKey.LOCATIONS]: MonitorServiceLocationsCodec,
  }),
  t.partial({
    [ConfigKey.TIMEOUT]: t.union([t.string, t.null]),
    [ConfigKey.REVISION]: t.number,
  }),
]);

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
});

export const TCPSensitiveAdvancedFieldsCodec = t.interface({
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: t.string,
  [ConfigKey.REQUEST_SEND_CHECK]: t.string,
});

export const TCPAdvancedCodec = t.intersection([
  TCPAdvancedFieldsCodec,
  TCPSensitiveAdvancedFieldsCodec,
]);

export type TCPAdvancedFields = t.TypeOf<typeof TCPAdvancedCodec>;

// TCPFields
export const EncryptedTCPFieldsCodec = t.intersection([
  TCPSimpleFieldsCodec,
  TCPAdvancedFieldsCodec,
  TLSFieldsCodec,
]);

export const TCPFieldsCodec = t.intersection([
  EncryptedTCPFieldsCodec,
  TCPSensitiveAdvancedFieldsCodec,
  TLSSensitiveFieldsCodec,
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
  [ConfigKey.PROXY_URL]: t.string,
  [ConfigKey.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicyCodec,
  [ConfigKey.RESPONSE_HEADERS_INDEX]: t.boolean,
  [ConfigKey.RESPONSE_STATUS_CHECK]: t.array(t.string),
  [ConfigKey.REQUEST_METHOD_CHECK]: t.string,
});

export const HTTPSensitiveAdvancedFieldsCodec = t.interface({
  [ConfigKey.PASSWORD]: t.string,
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: t.array(t.string),
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: t.array(t.string),
  [ConfigKey.RESPONSE_HEADERS_CHECK]: t.record(t.string, t.string),
  [ConfigKey.REQUEST_BODY_CHECK]: t.interface({ value: t.string, type: ModeCodec }),
  [ConfigKey.REQUEST_HEADERS_CHECK]: t.record(t.string, t.string),
  [ConfigKey.USERNAME]: t.string,
});

export const HTTPAdvancedCodec = t.intersection([
  HTTPAdvancedFieldsCodec,
  HTTPSensitiveAdvancedFieldsCodec,
]);

export type HTTPAdvancedFields = t.TypeOf<typeof HTTPAdvancedCodec>;

// HTTPFields
export const EncryptedHTTPFieldsCodec = t.intersection([
  HTTPSimpleFieldsCodec,
  HTTPAdvancedFieldsCodec,
  TLSFieldsCodec,
]);

export const HTTPFieldsCodec = t.intersection([
  EncryptedHTTPFieldsCodec,
  HTTPSensitiveAdvancedFieldsCodec,
  TLSSensitiveFieldsCodec,
]);

export type HTTPFields = t.TypeOf<typeof HTTPFieldsCodec>;

// Browser Fields
export const ThrottlingConfigKeyCodec = t.union([
  t.literal(ConfigKey.DOWNLOAD_SPEED),
  t.literal(ConfigKey.UPLOAD_SPEED),
  t.literal(ConfigKey.LATENCY),
]);

export type ThrottlingConfigKey = t.TypeOf<typeof ThrottlingConfigKeyCodec>;

export const EncryptedBrowserSimpleFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.METADATA]: MetadataCodec,
    [ConfigKey.SOURCE_ZIP_URL]: t.string,
    [ConfigKey.SOURCE_ZIP_FOLDER]: t.string,
    [ConfigKey.SOURCE_ZIP_PROXY_URL]: t.string,
  }),
  ZipUrlTLSFieldsCodec,
  ZipUrlTLSSensitiveFieldsCodec,
  CommonFieldsCodec,
]);

export const BrowserSensitiveSimpleFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.SOURCE_INLINE]: t.string,
    [ConfigKey.SOURCE_ZIP_USERNAME]: t.string,
    [ConfigKey.SOURCE_ZIP_PASSWORD]: t.string,
    [ConfigKey.PARAMS]: t.string,
    [ConfigKey.URLS]: t.union([t.string, t.undefined]),
    [ConfigKey.PORT]: t.union([t.number, t.undefined]),
  }),
  ZipUrlTLSFieldsCodec,
  CommonFieldsCodec,
]);

export const BrowserAdvancedFieldsCodec = t.interface({
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

export const BrowserSimpleFieldsCodec = t.intersection([
  EncryptedBrowserSimpleFieldsCodec,
  BrowserSensitiveSimpleFieldsCodec,
  ZipUrlTLSSensitiveFieldsCodec,
]);

export const BrowserSensitiveAdvancedFieldsCodec = t.interface({
  [ConfigKey.SYNTHETICS_ARGS]: t.array(t.string),
});

export const BrowserAdvancedsCodec = t.intersection([
  BrowserAdvancedFieldsCodec,
  BrowserSensitiveAdvancedFieldsCodec,
]);

export const EncryptedBrowserFieldsCodec = t.intersection([
  EncryptedBrowserSimpleFieldsCodec,
  BrowserAdvancedFieldsCodec,
]);

export const BrowserFieldsCodec = t.intersection([
  BrowserSimpleFieldsCodec,
  BrowserAdvancedFieldsCodec,
  BrowserSensitiveAdvancedFieldsCodec,
]);

export type BrowserFields = t.TypeOf<typeof BrowserFieldsCodec>;
export type BrowserSimpleFields = t.TypeOf<typeof BrowserSimpleFieldsCodec>;
export type BrowserAdvancedFields = t.TypeOf<typeof BrowserAdvancedsCodec>;

// MonitorFields, represents any possible monitor type
export const MonitorFieldsCodec = t.intersection([
  HTTPFieldsCodec,
  TCPFieldsCodec,
  ICMPSimpleFieldsCodec,
  BrowserFieldsCodec,
]);

export type MonitorFields = t.TypeOf<typeof MonitorFieldsCodec>;

// Monitor, represents one of (Icmp | Tcp | Http | Browser)
export const SyntheticsMonitorCodec = t.union([
  HTTPFieldsCodec,
  TCPFieldsCodec,
  ICMPSimpleFieldsCodec,
  BrowserFieldsCodec,
]);

export const EncryptedSyntheticsMonitorCodec = t.union([
  EncryptedHTTPFieldsCodec,
  EncryptedTCPFieldsCodec,
  ICMPSimpleFieldsCodec,
  EncryptedBrowserFieldsCodec,
]);

export type SyntheticsMonitor = t.TypeOf<typeof SyntheticsMonitorCodec>;

export const SyntheticsMonitorWithIdCodec = t.intersection([
  SyntheticsMonitorCodec,
  t.interface({ id: t.string }),
]);

export const EncryptedSyntheticsMonitorWithIdCodec = t.intersection([
  EncryptedSyntheticsMonitorCodec,
  t.interface({ id: t.string }),
]);

export type SyntheticsMonitorWithId = t.TypeOf<typeof SyntheticsMonitorWithIdCodec>;

export type EncryptedSyntheticsMonitorWithId = t.TypeOf<
  typeof EncryptedSyntheticsMonitorWithIdCodec
>;

export const MonitorManagementListResultCodec = t.type({
  monitors: t.array(
    t.interface({
      id: t.string,
      attributes: EncryptedSyntheticsMonitorCodec,
      updated_at: t.string,
    })
  ),
  page: t.number,
  perPage: t.number,
  total: t.union([t.number, t.null]),
  syncErrors: t.union([ServiceLocationErrors, t.null]),
});

export type MonitorManagementListResult = t.TypeOf<typeof MonitorManagementListResultCodec>;

export const SyntheticsMonitorWithSecretsCodec = t.intersection([
  EncryptedSyntheticsMonitorCodec,
  t.interface({
    secrets: t.string,
  }),
]);

export type Secret = typeof secretKeys[number];

export type SyntheticsMonitorWithSecrets = Omit<
  t.TypeOf<typeof SyntheticsMonitorWithSecretsCodec>,
  Secret
>;

export type EncryptedSyntheticsMonitor = Omit<SyntheticsMonitorWithSecrets, 'secrets'>;
