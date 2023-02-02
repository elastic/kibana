/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { AlertConfigsCodec } from './alert_config';
import { secretKeys } from '../../constants/monitor_management';
import { ConfigKey } from './config_key';
import { MonitorServiceLocationCodec, ServiceLocationErrors } from './locations';
import {
  DataStream,
  DataStreamCodec,
  FormMonitorTypeCodec,
  ModeCodec,
  ResponseBodyIndexPolicyCodec,
  ScheduleUnitCodec,
  SourceTypeCodec,
  TLSVersionCodec,
  VerificationModeCodec,
} from './monitor_configs';
import { MetadataCodec } from './monitor_meta_data';
import { PrivateLocationCodec } from './synthetics_private_locations';

const ScheduleCodec = t.interface({
  number: t.string,
  unit: ScheduleUnitCodec,
});

export type SyntheticsMonitorSchedule = t.TypeOf<typeof ScheduleCodec>;

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
    [ConfigKey.SCHEDULE]: ScheduleCodec,
    [ConfigKey.APM_SERVICE_NAME]: t.string,
    [ConfigKey.TAGS]: t.array(t.string),
    [ConfigKey.LOCATIONS]: t.array(t.union([MonitorServiceLocationCodec, PrivateLocationCodec])),
    [ConfigKey.MONITOR_QUERY_ID]: t.string,
    [ConfigKey.CONFIG_ID]: t.string,
  }),
  t.partial({
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorTypeCodec,
    [ConfigKey.TIMEOUT]: t.union([t.string, t.null]),
    [ConfigKey.REVISION]: t.number,
    [ConfigKey.MONITOR_SOURCE_TYPE]: SourceTypeCodec,
    [ConfigKey.CONFIG_HASH]: t.string,
    [ConfigKey.JOURNEY_ID]: t.string,
    [ConfigKey.PROJECT_ID]: t.string,
    [ConfigKey.ORIGINAL_SPACE]: t.string,
    [ConfigKey.CUSTOM_HEARTBEAT_ID]: t.string,
    [ConfigKey.ALERT_CONFIG]: AlertConfigsCodec,
  }),
]);

export type CommonFields = t.TypeOf<typeof CommonFieldsCodec>;

// TCP Simple Fields
export const TCPSimpleFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.METADATA]: MetadataCodec,
    [ConfigKey.HOSTS]: t.string,
    [ConfigKey.PORT]: t.union([t.number, t.null]),
  }),
  t.partial({
    [ConfigKey.URLS]: t.string,
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
    [ConfigKey.PORT]: t.union([t.number, t.null]),
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
  t.intersection([
    t.interface({
      [ConfigKey.METADATA]: MetadataCodec,
      [ConfigKey.SOURCE_ZIP_URL]: t.string,
      [ConfigKey.SOURCE_ZIP_FOLDER]: t.string,
      [ConfigKey.SOURCE_ZIP_PROXY_URL]: t.string,
    }),
    t.partial({
      [ConfigKey.PLAYWRIGHT_OPTIONS]: t.string,
      [ConfigKey.TEXT_ASSERTION]: t.string,
    }),
  ]),
  ZipUrlTLSFieldsCodec,
  ZipUrlTLSSensitiveFieldsCodec,
  CommonFieldsCodec,
]);

export const BrowserSensitiveSimpleFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.SOURCE_INLINE]: t.string,
    [ConfigKey.SOURCE_PROJECT_CONTENT]: t.string,
    [ConfigKey.SOURCE_ZIP_USERNAME]: t.string,
    [ConfigKey.SOURCE_ZIP_PASSWORD]: t.string,
    [ConfigKey.PARAMS]: t.string,
    [ConfigKey.URLS]: t.union([t.string, t.null]),
    [ConfigKey.PORT]: t.union([t.number, t.null]),
  }),
  ZipUrlTLSFieldsCodec,
  CommonFieldsCodec,
]);

export const EncryptedBrowserAdvancedFieldsCodec = t.interface({
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

export const BrowserAdvancedFieldsCodec = t.intersection([
  EncryptedBrowserAdvancedFieldsCodec,
  BrowserSensitiveAdvancedFieldsCodec,
]);

export const EncryptedBrowserFieldsCodec = t.intersection([
  EncryptedBrowserSimpleFieldsCodec,
  EncryptedBrowserAdvancedFieldsCodec,
  TLSFieldsCodec,
]);

export const BrowserFieldsCodec = t.intersection([
  BrowserSimpleFieldsCodec,
  BrowserAdvancedFieldsCodec,
  TLSCodec,
]);

export type BrowserFields = t.TypeOf<typeof BrowserFieldsCodec>;
export type BrowserSimpleFields = t.TypeOf<typeof BrowserSimpleFieldsCodec>;
export type BrowserAdvancedFields = t.TypeOf<typeof BrowserAdvancedFieldsCodec>;

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

export const HeartbeatConfigCodec = t.intersection([
  SyntheticsMonitorWithIdCodec,
  t.partial({
    fields_under_root: t.boolean,
    fields: t.intersection([
      t.interface({
        config_id: t.string,
      }),
      t.partial({
        run_once: t.boolean,
        test_run_id: t.string,
        'monitor.project.name': t.string,
        'monitor.project.id': t.string,
      }),
    ]),
  }),
]);

export const EncryptedSyntheticsMonitorWithIdCodec = t.intersection([
  EncryptedSyntheticsMonitorCodec,
  t.interface({ id: t.string }),
]);

// TODO: Remove EncryptedSyntheticsMonitorWithIdCodec (as well as SyntheticsMonitorWithIdCodec if possible) along with respective TypeScript types in favor of EncryptedSyntheticsSavedMonitorCodec
export const EncryptedSyntheticsSavedMonitorCodec = t.intersection([
  EncryptedSyntheticsMonitorCodec,
  t.interface({ id: t.string, updated_at: t.string, created_at: t.string }),
]);

export type SyntheticsMonitorWithId = t.TypeOf<typeof SyntheticsMonitorWithIdCodec>;

export type EncryptedSyntheticsMonitorWithId = t.TypeOf<
  typeof EncryptedSyntheticsMonitorWithIdCodec
>;

export type EncryptedSyntheticsSavedMonitor = t.TypeOf<typeof EncryptedSyntheticsSavedMonitorCodec>;

export type HeartbeatConfig = t.TypeOf<typeof HeartbeatConfigCodec>;

export const MonitorDefaultsCodec = t.interface({
  [DataStream.HTTP]: HTTPFieldsCodec,
  [DataStream.TCP]: TCPFieldsCodec,
  [DataStream.ICMP]: ICMPSimpleFieldsCodec,
  [DataStream.BROWSER]: BrowserFieldsCodec,
});

export type MonitorDefaults = t.TypeOf<typeof MonitorDefaultsCodec>;

export const MonitorManagementListResultCodec = t.type({
  monitors: t.array(
    t.intersection([
      t.interface({
        id: t.string,
        attributes: EncryptedSyntheticsMonitorCodec,
      }),
      t.partial({
        updated_at: t.string,
        created_at: t.string,
      }),
    ])
  ),
  page: t.number,
  perPage: t.number,
  total: t.union([t.number, t.null]),
  absoluteTotal: t.union([t.number, t.null]),
  syncErrors: t.union([ServiceLocationErrors, t.null]),
});

export type MonitorManagementListResult = t.TypeOf<typeof MonitorManagementListResultCodec>;

export const MonitorOverviewItemCodec = t.interface({
  name: t.string,
  id: t.string,
  configId: t.string,
  location: MonitorServiceLocationCodec,
  isEnabled: t.boolean,
  isStatusAlertEnabled: t.boolean,
});

export type MonitorOverviewItem = t.TypeOf<typeof MonitorOverviewItemCodec>;

export const MonitorOverviewResultCodec = t.type({
  total: t.number,
  allMonitorIds: t.array(t.string),
  monitors: t.array(MonitorOverviewItemCodec),
});

export type MonitorOverviewResult = t.TypeOf<typeof MonitorOverviewResultCodec>;

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
