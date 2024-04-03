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
  MonitorTypeEnum,
  MonitorTypeCodec,
  FormMonitorTypeCodec,
  ModeCodec,
  ResponseBodyIndexPolicyCodec,
  ResponseCheckJSONCodec,
  ScheduleUnitCodec,
  SourceTypeCodec,
  TLSVersionCodec,
  VerificationModeCodec,
  RequestBodyCheckCodec,
} from './monitor_configs';
import { MetadataCodec } from './monitor_meta_data';
import { PrivateLocationCodec } from './synthetics_private_locations';

const ScheduleCodec = t.interface({
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

const MonitorLocationsCodec = t.array(t.union([MonitorServiceLocationCodec, PrivateLocationCodec]));

export type MonitorLocations = t.TypeOf<typeof MonitorLocationsCodec>;

// CommonFields
export const CommonFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.NAME]: t.string,
    [ConfigKey.NAMESPACE]: t.string,
    [ConfigKey.MONITOR_TYPE]: MonitorTypeCodec,
    [ConfigKey.ENABLED]: t.boolean,
    [ConfigKey.SCHEDULE]: ScheduleCodec,
    [ConfigKey.APM_SERVICE_NAME]: t.string,
    [ConfigKey.TAGS]: t.array(t.string),
    [ConfigKey.LOCATIONS]: MonitorLocationsCodec,
    [ConfigKey.MONITOR_QUERY_ID]: t.string,
    [ConfigKey.CONFIG_ID]: t.string,
    [ConfigKey.MAX_ATTEMPTS]: t.number,
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
    [ConfigKey.PARAMS]: t.string,
  }),
]);

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

// TCPAdvancedFields
export const TCPAdvancedFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.PROXY_URL]: t.string,
    [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: t.boolean,
  }),
  t.partial({
    [ConfigKey.MODE]: ModeCodec,
    [ConfigKey.IPV4]: t.boolean,
    [ConfigKey.IPV6]: t.boolean,
  }),
]);

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

// ICMPAdvancedFields
export const ICMPAdvancedFieldsCodec = t.partial({
  [ConfigKey.MODE]: ModeCodec,
  [ConfigKey.IPV4]: t.boolean,
  [ConfigKey.IPV6]: t.boolean,
});

// ICMPFields
export const ICMPFieldsCodec = t.intersection([ICMPSimpleFieldsCodec, ICMPAdvancedFieldsCodec]);

export type ICMPFields = t.TypeOf<typeof ICMPFieldsCodec>;

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
export const HTTPAdvancedFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.PROXY_URL]: t.string,
    [ConfigKey.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicyCodec,
    [ConfigKey.RESPONSE_HEADERS_INDEX]: t.boolean,
    [ConfigKey.RESPONSE_STATUS_CHECK]: t.array(t.string),
    [ConfigKey.REQUEST_METHOD_CHECK]: t.string,
  }),
  t.partial({
    [ConfigKey.MODE]: ModeCodec,
    [ConfigKey.RESPONSE_BODY_MAX_BYTES]: t.string,
    [ConfigKey.IPV4]: t.boolean,
    [ConfigKey.IPV6]: t.boolean,
  }),
]);

export const HTTPSensitiveAdvancedFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.PASSWORD]: t.string,
    [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: t.array(t.string),
    [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: t.array(t.string),
    [ConfigKey.RESPONSE_HEADERS_CHECK]: t.record(t.string, t.string),
    [ConfigKey.REQUEST_BODY_CHECK]: RequestBodyCheckCodec,
    [ConfigKey.REQUEST_HEADERS_CHECK]: t.record(t.string, t.string),
    [ConfigKey.USERNAME]: t.string,
  }),
  t.partial({
    [ConfigKey.PROXY_HEADERS]: t.record(t.string, t.string),
    [ConfigKey.RESPONSE_JSON_CHECK]: t.array(ResponseCheckJSONCodec),
  }),
]);

export const HTTPAdvancedCodec = t.intersection([
  HTTPAdvancedFieldsCodec,
  HTTPSensitiveAdvancedFieldsCodec,
]);

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

export const EncryptedBrowserSimpleFieldsCodec = t.intersection([
  t.intersection([
    t.interface({
      [ConfigKey.METADATA]: MetadataCodec,
    }),
    t.partial({
      [ConfigKey.PLAYWRIGHT_OPTIONS]: t.string,
      [ConfigKey.TEXT_ASSERTION]: t.string,
    }),
  ]),
  CommonFieldsCodec,
]);

export const BrowserSensitiveSimpleFieldsCodec = t.intersection([
  t.interface({
    [ConfigKey.SOURCE_INLINE]: t.string,
    [ConfigKey.SOURCE_PROJECT_CONTENT]: t.string,
    [ConfigKey.URLS]: t.union([t.string, t.null]),
    [ConfigKey.PORT]: t.union([t.number, t.null]),
  }),
  CommonFieldsCodec,
]);

export const ThrottlingConfigValueCodec = t.interface({
  download: t.string,
  upload: t.string,
  latency: t.string,
});

export type ThrottlingConfigValue = t.TypeOf<typeof ThrottlingConfigValueCodec>;

export const ThrottlingConfigCodec = t.interface({
  value: t.union([ThrottlingConfigValueCodec, t.null]),
  label: t.string,
  id: t.string,
});

export type ThrottlingConfig = t.TypeOf<typeof ThrottlingConfigCodec>;

export const EncryptedBrowserAdvancedFieldsCodec = t.interface({
  [ConfigKey.SCREENSHOTS]: t.string,
  [ConfigKey.JOURNEY_FILTERS_MATCH]: t.string,
  [ConfigKey.JOURNEY_FILTERS_TAGS]: t.array(t.string),
  [ConfigKey.IGNORE_HTTPS_ERRORS]: t.boolean,
  [ConfigKey.THROTTLING_CONFIG]: ThrottlingConfigCodec,
});

export const BrowserSimpleFieldsCodec = t.intersection([
  EncryptedBrowserSimpleFieldsCodec,
  BrowserSensitiveSimpleFieldsCodec,
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

// MonitorFields, represents any possible monitor type
export const MonitorFieldsCodec = t.intersection([
  HTTPFieldsCodec,
  TCPFieldsCodec,
  ICMPSimpleFieldsCodec,
  BrowserFieldsCodec,
]);

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

export const SyntheticsMonitorWithIdCodec = t.intersection([
  SyntheticsMonitorCodec,
  t.interface({ id: t.string }),
]);

const HeartbeatFieldsCodec = t.intersection([
  t.interface({
    config_id: t.string,
  }),
  t.partial({
    run_once: t.boolean,
    test_run_id: t.string,
    'monitor.project.name': t.string,
    'monitor.id': t.string,
    'monitor.project.id': t.string,
    'monitor.fleet_managed': t.boolean,
    meta: t.record(t.string, t.string),
  }),
]);

export const HeartbeatConfigCodec = t.intersection([
  SyntheticsMonitorWithIdCodec,
  t.partial({
    fields_under_root: t.boolean,
    fields: HeartbeatFieldsCodec,
  }),
]);

export const EncryptedSyntheticsSavedMonitorCodec = t.intersection([
  EncryptedSyntheticsMonitorCodec,
  t.interface({ id: t.string, updated_at: t.string, created_at: t.string }),
]);

export const MonitorDefaultsCodec = t.interface({
  [MonitorTypeEnum.HTTP]: HTTPFieldsCodec,
  [MonitorTypeEnum.TCP]: TCPFieldsCodec,
  [MonitorTypeEnum.ICMP]: ICMPSimpleFieldsCodec,
  [MonitorTypeEnum.BROWSER]: BrowserFieldsCodec,
});

export const MonitorManagementListResultCodec = t.type({
  monitors: t.array(EncryptedSyntheticsSavedMonitorCodec),
  page: t.number,
  perPage: t.number,
  total: t.union([t.number, t.null]),
  absoluteTotal: t.union([t.number, t.null]),
  syncErrors: t.union([ServiceLocationErrors, t.null]),
});

export const MonitorOverviewItemCodec = t.intersection([
  t.interface({
    name: t.string,
    id: t.string,
    configId: t.string,
    location: MonitorServiceLocationCodec,
    isEnabled: t.boolean,
    isStatusAlertEnabled: t.boolean,
    type: t.string,
    tags: t.array(t.string),
    schedule: t.string,
  }),
  t.partial({
    projectId: t.string,
  }),
]);

export const MonitorOverviewResultCodec = t.type({
  total: t.number,
  allMonitorIds: t.array(t.string),
  monitors: t.array(MonitorOverviewItemCodec),
});

export const SyntheticsMonitorWithSecretsCodec = t.intersection([
  EncryptedSyntheticsMonitorCodec,
  t.interface({
    secrets: t.string,
  }),
]);

export type SyntheticsMonitorSchedule = t.TypeOf<typeof ScheduleCodec>;
export type TLSFields = t.TypeOf<typeof TLSCodec>;
export type CommonFields = t.TypeOf<typeof CommonFieldsCodec>;
export type TCPSimpleFields = t.TypeOf<typeof TCPSimpleFieldsCodec>;
export type HTTPAdvancedFields = t.TypeOf<typeof HTTPAdvancedCodec>;
export type HTTPFields = t.TypeOf<typeof HTTPFieldsCodec>;
export type BrowserFields = t.TypeOf<typeof BrowserFieldsCodec>;
export type BrowserSimpleFields = t.TypeOf<typeof BrowserSimpleFieldsCodec>;
export type BrowserAdvancedFields = t.TypeOf<typeof BrowserAdvancedFieldsCodec>;
export type MonitorFields = t.TypeOf<typeof MonitorFieldsCodec>;
export type HeartbeatFields = t.TypeOf<typeof HeartbeatFieldsCodec>;
export type SyntheticsMonitor = t.TypeOf<typeof SyntheticsMonitorCodec>;
export type SyntheticsMonitorWithId = t.TypeOf<typeof SyntheticsMonitorWithIdCodec>;
export type EncryptedSyntheticsSavedMonitor = t.TypeOf<typeof EncryptedSyntheticsSavedMonitorCodec>;
export type HeartbeatConfig = t.TypeOf<typeof HeartbeatConfigCodec>;
export type MonitorDefaults = t.TypeOf<typeof MonitorDefaultsCodec>;
export type MonitorManagementListResult = t.TypeOf<typeof MonitorManagementListResultCodec>;
export type MonitorOverviewItem = t.TypeOf<typeof MonitorOverviewItemCodec>;
export type MonitorOverviewResult = t.TypeOf<typeof MonitorOverviewResultCodec>;
export type Secret = typeof secretKeys[number];
export type SyntheticsMonitorWithSecrets = Omit<
  t.TypeOf<typeof SyntheticsMonitorWithSecretsCodec>,
  Secret
>;
export type SyntheticsMonitorWithSecretsAttributes = Omit<
  t.TypeOf<typeof SyntheticsMonitorWithSecretsCodec>,
  Secret
>;
export type EncryptedSyntheticsMonitor = Omit<SyntheticsMonitorWithSecrets, 'secrets'>;
export type EncryptedSyntheticsMonitorAttributes = Omit<SyntheticsMonitorWithSecrets, 'secrets'>;
