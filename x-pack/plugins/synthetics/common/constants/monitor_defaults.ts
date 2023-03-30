/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  BrowserAdvancedFields,
  BrowserSimpleFields,
  CommonFields,
  DataStream,
  FormMonitorType,
  HTTPAdvancedFields,
  HTTPMethod,
  HTTPSimpleFields,
  ICMPSimpleFields,
  Mode,
  MonitorDefaults,
  ResponseBodyIndexPolicy,
  ScheduleUnit,
  ScreenshotOption,
  SourceType,
  TCPAdvancedFields,
  TCPSimpleFields,
  TLSFields,
  TLSVersion,
  VerificationMode,
} from '../runtime_types/monitor_management';
import { ConfigKey } from './monitor_management';

export const DEFAULT_NAMESPACE_STRING = 'default';

export const DEFAULT_COMMON_FIELDS: CommonFields = {
  [ConfigKey.MONITOR_TYPE]: DataStream.HTTP,
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
  [ConfigKey.ENABLED]: true,
  [ConfigKey.ALERT_CONFIG]: { status: { enabled: true } },
  [ConfigKey.SCHEDULE]: {
    number: '3',
    unit: ScheduleUnit.MINUTES,
  },
  [ConfigKey.APM_SERVICE_NAME]: '',
  [ConfigKey.CONFIG_ID]: '',
  [ConfigKey.TAGS]: [],
  [ConfigKey.TIMEOUT]: '16',
  [ConfigKey.NAME]: '',
  [ConfigKey.LOCATIONS]: [],
  [ConfigKey.NAMESPACE]: DEFAULT_NAMESPACE_STRING,
  [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.UI,
  [ConfigKey.JOURNEY_ID]: '',
  [ConfigKey.CONFIG_HASH]: '',
  [ConfigKey.MONITOR_QUERY_ID]: '',
};

export const DEFAULT_BROWSER_ADVANCED_FIELDS: BrowserAdvancedFields = {
  [ConfigKey.SCREENSHOTS]: ScreenshotOption.ON,
  [ConfigKey.SYNTHETICS_ARGS]: [],
  [ConfigKey.JOURNEY_FILTERS_MATCH]: '',
  [ConfigKey.JOURNEY_FILTERS_TAGS]: [],
  [ConfigKey.IGNORE_HTTPS_ERRORS]: false,
  [ConfigKey.IS_THROTTLING_ENABLED]: true,
  [ConfigKey.DOWNLOAD_SPEED]: '5',
  [ConfigKey.UPLOAD_SPEED]: '3',
  [ConfigKey.LATENCY]: '20',
  [ConfigKey.THROTTLING_CONFIG]: '5d/3u/20l',
};

export const DEFAULT_BROWSER_SIMPLE_FIELDS: BrowserSimpleFields = {
  ...DEFAULT_COMMON_FIELDS,
  [ConfigKey.PROJECT_ID]: '',
  [ConfigKey.PLAYWRIGHT_OPTIONS]: '',
  [ConfigKey.METADATA]: {
    script_source: {
      is_generated_script: false,
      file_name: '',
    },
    is_zip_url_tls_enabled: false,
  },
  [ConfigKey.MONITOR_TYPE]: DataStream.BROWSER,
  [ConfigKey.PARAMS]: '',
  [ConfigKey.PORT]: null,
  [ConfigKey.SCHEDULE]: {
    unit: ScheduleUnit.MINUTES,
    number: '10',
  },
  [ConfigKey.SOURCE_INLINE]: '',
  [ConfigKey.SOURCE_PROJECT_CONTENT]: '',
  [ConfigKey.SOURCE_ZIP_URL]: '',
  [ConfigKey.SOURCE_ZIP_USERNAME]: '',
  [ConfigKey.SOURCE_ZIP_PASSWORD]: '',
  [ConfigKey.SOURCE_ZIP_FOLDER]: '',
  [ConfigKey.SOURCE_ZIP_PROXY_URL]: '',
  [ConfigKey.TEXT_ASSERTION]: '',
  [ConfigKey.URLS]: '',
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
  [ConfigKey.TIMEOUT]: null,

  // Deprecated, slated to be removed in a future version
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]: undefined,
  [ConfigKey.ZIP_URL_TLS_CERTIFICATE]: undefined,
  [ConfigKey.ZIP_URL_TLS_KEY]: undefined,
  [ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE]: undefined,
  [ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE]: undefined,
  [ConfigKey.ZIP_URL_TLS_VERSION]: undefined,
};

export const DEFAULT_HTTP_SIMPLE_FIELDS: HTTPSimpleFields = {
  ...DEFAULT_COMMON_FIELDS,
  [ConfigKey.METADATA]: {
    is_tls_enabled: false,
  },
  [ConfigKey.URLS]: '',
  [ConfigKey.MAX_REDIRECTS]: '0',
  [ConfigKey.MONITOR_TYPE]: DataStream.HTTP,
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.HTTP,
  [ConfigKey.PORT]: null,
};

export const DEFAULT_HTTP_ADVANCED_FIELDS: HTTPAdvancedFields = {
  [ConfigKey.PASSWORD]: '',
  [ConfigKey.PROXY_URL]: '',
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: [],
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: [],
  [ConfigKey.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicy.ON_ERROR,
  [ConfigKey.RESPONSE_HEADERS_CHECK]: {},
  [ConfigKey.RESPONSE_HEADERS_INDEX]: true,
  [ConfigKey.RESPONSE_STATUS_CHECK]: [],
  [ConfigKey.REQUEST_BODY_CHECK]: {
    value: '',
    type: Mode.PLAINTEXT,
  },
  [ConfigKey.REQUEST_HEADERS_CHECK]: {},
  [ConfigKey.REQUEST_METHOD_CHECK]: HTTPMethod.GET,
  [ConfigKey.USERNAME]: '',
};

export const DEFAULT_ICMP_SIMPLE_FIELDS: ICMPSimpleFields = {
  ...DEFAULT_COMMON_FIELDS,
  [ConfigKey.HOSTS]: '',
  [ConfigKey.MONITOR_TYPE]: DataStream.ICMP,
  [ConfigKey.WAIT]: '1',
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.ICMP,
};

export const DEFAULT_TCP_SIMPLE_FIELDS: TCPSimpleFields = {
  ...DEFAULT_COMMON_FIELDS,
  [ConfigKey.METADATA]: {
    is_tls_enabled: false,
  },
  [ConfigKey.HOSTS]: '',
  [ConfigKey.URLS]: '',
  [ConfigKey.MONITOR_TYPE]: DataStream.TCP,
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.TCP,
  [ConfigKey.PORT]: null,
};

export const DEFAULT_TCP_ADVANCED_FIELDS: TCPAdvancedFields = {
  [ConfigKey.PROXY_URL]: '',
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: false,
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: '',
  [ConfigKey.REQUEST_SEND_CHECK]: '',
};

export const DEFAULT_TLS_FIELDS: TLSFields = {
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: '',
  [ConfigKey.TLS_CERTIFICATE]: '',
  [ConfigKey.TLS_KEY]: '',
  [ConfigKey.TLS_KEY_PASSPHRASE]: '',
  [ConfigKey.TLS_VERIFICATION_MODE]: VerificationMode.FULL,
  [ConfigKey.TLS_VERSION]: [TLSVersion.ONE_ONE, TLSVersion.ONE_TWO, TLSVersion.ONE_THREE],
};

export const DEFAULT_FIELDS: MonitorDefaults = {
  [DataStream.HTTP]: {
    ...DEFAULT_HTTP_SIMPLE_FIELDS,
    ...DEFAULT_HTTP_ADVANCED_FIELDS,
    ...DEFAULT_TLS_FIELDS,
  },
  [DataStream.TCP]: {
    ...DEFAULT_TCP_SIMPLE_FIELDS,
    ...DEFAULT_TCP_ADVANCED_FIELDS,
    ...DEFAULT_TLS_FIELDS,
  },
  [DataStream.ICMP]: {
    ...DEFAULT_ICMP_SIMPLE_FIELDS,
  },
  [DataStream.BROWSER]: {
    ...DEFAULT_BROWSER_SIMPLE_FIELDS,
    ...DEFAULT_BROWSER_ADVANCED_FIELDS,
    ...DEFAULT_TLS_FIELDS,
  },
};
