/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import {
  CodeEditorMode,
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
  ThrottlingConfig,
  TLSFields,
  TLSVersion,
  VerificationMode,
} from '../runtime_types/monitor_management';
import { ConfigKey } from './monitor_management';

export const DEFAULT_NAMESPACE_STRING = 'default';

export enum PROFILE_VALUES_ENUM {
  DEFAULT = 'default',
  CABLE = 'cable',
  DSL = 'dsl',
  THREE_G = '3g',
  FOUR_G = '4g',
  LTE = 'lte',
  FIBRE = 'fibre',
  NO_THROTTLING = 'no-throttling',
  CUSTOM = 'custom',
}

export const CUSTOM_LABEL = i18n.translate('xpack.synthetics.connectionProfile.custom', {
  defaultMessage: 'Custom',
});

export const DEFAULT_THROTTLING_VALUE = { download: '5', upload: '3', latency: '20' };

export const PROFILE_VALUES: ThrottlingConfig[] = [
  {
    value: DEFAULT_THROTTLING_VALUE,
    id: PROFILE_VALUES_ENUM.DEFAULT,
    label: i18n.translate('xpack.synthetics.connectionProfile.default', {
      defaultMessage: 'Default',
    }),
  },
  {
    value: { download: '5', upload: '1', latency: '28' },
    id: PROFILE_VALUES_ENUM.CABLE,
    label: i18n.translate('xpack.synthetics.connectionProfile.cable', {
      defaultMessage: 'Cable',
    }),
  },
  {
    value: { download: '1.5', upload: '0.384', latency: '50' },
    id: PROFILE_VALUES_ENUM.DSL,
    label: i18n.translate('xpack.synthetics.connectionProfile.dsl', {
      defaultMessage: 'DSL',
    }),
  },
  {
    value: { download: '1.6', upload: '0.768', latency: '300' },
    id: PROFILE_VALUES_ENUM.THREE_G,
    label: i18n.translate('xpack.synthetics.connectionProfile.threeG', {
      defaultMessage: '3G',
    }),
  },
  {
    value: { download: '9', upload: '0.75', latency: '170' },
    id: PROFILE_VALUES_ENUM.FOUR_G,
    label: i18n.translate('xpack.synthetics.connectionProfile.fourG', {
      defaultMessage: '4G',
    }),
  },
  {
    value: { download: '12', upload: '0.75', latency: '70' },
    id: PROFILE_VALUES_ENUM.LTE,
    label: i18n.translate('xpack.synthetics.connectionProfile.lte', {
      defaultMessage: 'LTE',
    }),
  },
  {
    value: { download: '20', upload: '5', latency: '4' },
    id: PROFILE_VALUES_ENUM.FIBRE,
    label: i18n.translate('xpack.synthetics.connectionProfile.fibre', {
      defaultMessage: 'Fibre',
    }),
  },
  {
    value: null,
    id: PROFILE_VALUES_ENUM.NO_THROTTLING,
    label: i18n.translate('xpack.synthetics.connectionProfile.noThrottling', {
      defaultMessage: 'No throttling',
    }),
  },
];

export const PROFILES_MAP = PROFILE_VALUES.reduce((acc, profile) => {
  acc[profile.id] = profile;
  return acc;
}, {} as { [key: string]: ThrottlingConfig });

export const ALLOWED_SCHEDULES_IN_MINUTES = [
  '1',
  '3',
  '5',
  '10',
  '15',
  '20',
  '30',
  '60',
  '120',
  '240',
];

export const DEFAULT_COMMON_FIELDS: CommonFields = {
  [ConfigKey.MONITOR_TYPE]: DataStream.HTTP,
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
  [ConfigKey.ENABLED]: true,
  [ConfigKey.ALERT_CONFIG]: { status: { enabled: true }, tls: { enabled: true } },
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
  [ConfigKey.PARAMS]: '',
  [ConfigKey.MAX_ATTEMPTS]: 2,
};

export const DEFAULT_BROWSER_ADVANCED_FIELDS: BrowserAdvancedFields = {
  [ConfigKey.SCREENSHOTS]: ScreenshotOption.ON,
  [ConfigKey.SYNTHETICS_ARGS]: [],
  [ConfigKey.JOURNEY_FILTERS_MATCH]: '',
  [ConfigKey.JOURNEY_FILTERS_TAGS]: [],
  [ConfigKey.IGNORE_HTTPS_ERRORS]: false,
  [ConfigKey.THROTTLING_CONFIG]: PROFILES_MAP[PROFILE_VALUES_ENUM.DEFAULT],
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
  },
  [ConfigKey.MONITOR_TYPE]: DataStream.BROWSER,
  [ConfigKey.PORT]: null,
  [ConfigKey.SCHEDULE]: {
    unit: ScheduleUnit.MINUTES,
    number: '10',
  },
  [ConfigKey.SOURCE_INLINE]: '',
  [ConfigKey.SOURCE_PROJECT_CONTENT]: '',
  [ConfigKey.TEXT_ASSERTION]: '',
  [ConfigKey.URLS]: '',
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
  [ConfigKey.TIMEOUT]: null,
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
  [ConfigKey.PROXY_HEADERS]: {},
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: [],
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: [],
  [ConfigKey.RESPONSE_JSON_CHECK]: [],
  [ConfigKey.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicy.ON_ERROR,
  [ConfigKey.RESPONSE_HEADERS_CHECK]: {},
  [ConfigKey.RESPONSE_HEADERS_INDEX]: true,
  [ConfigKey.RESPONSE_STATUS_CHECK]: [],
  [ConfigKey.REQUEST_BODY_CHECK]: {
    value: '',
    type: CodeEditorMode.PLAINTEXT,
  },
  [ConfigKey.REQUEST_HEADERS_CHECK]: {},
  [ConfigKey.REQUEST_METHOD_CHECK]: HTTPMethod.GET,
  [ConfigKey.USERNAME]: '',
  [ConfigKey.MODE]: Mode.ANY,
  [ConfigKey.RESPONSE_BODY_MAX_BYTES]: '1024',
  [ConfigKey.IPV4]: true,
  [ConfigKey.IPV6]: true,
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
  [ConfigKey.MODE]: Mode.ANY,
  [ConfigKey.IPV4]: true,
  [ConfigKey.IPV6]: true,
};

export const DEFAULT_ICMP_ADVANCED_FIELDS = {
  [ConfigKey.MODE]: Mode.ANY,
  [ConfigKey.IPV4]: true,
  [ConfigKey.IPV6]: true,
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
    ...DEFAULT_ICMP_ADVANCED_FIELDS,
  },
  [DataStream.BROWSER]: {
    ...DEFAULT_BROWSER_SIMPLE_FIELDS,
    ...DEFAULT_BROWSER_ADVANCED_FIELDS,
    ...DEFAULT_TLS_FIELDS,
  },
};
