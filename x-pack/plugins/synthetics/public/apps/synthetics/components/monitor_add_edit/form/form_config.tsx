/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ConfigKey, FormMonitorType, FieldMeta } from '../types';
import { AlertConfigKey } from '../constants';
import { FIELD } from './field_config';

const DEFAULT_DATA_OPTIONS = (readOnly: boolean) => ({
  title: i18n.translate('xpack.synthetics.monitorConfig.section.dataOptions.title', {
    defaultMessage: 'Data options',
  }),
  description: i18n.translate('xpack.synthetics.monitorConfig.section.dataOptions.description', {
    defaultMessage: 'Configure data options to add context to the data coming from your monitors.',
  }),
  components: [
    FIELD(readOnly)[ConfigKey.TAGS],
    FIELD(readOnly)[ConfigKey.APM_SERVICE_NAME],
    FIELD(readOnly)[ConfigKey.NAMESPACE],
  ],
});

const HTTP_ADVANCED = (readOnly: boolean) => ({
  requestConfig: {
    title: i18n.translate('xpack.synthetics.monitorConfig.section.requestConfiguration.title', {
      defaultMessage: 'Request configuration',
    }),
    description: i18n.translate(
      'xpack.synthetics.monitorConfig.section.requestConfiguration.description',
      {
        defaultMessage:
          'Configure an optional request to send to the remote host including method, body, and headers.',
      }
    ),
    components: [
      FIELD(readOnly)[ConfigKey.USERNAME],
      FIELD(readOnly)[ConfigKey.PASSWORD],
      FIELD(readOnly)[ConfigKey.REQUEST_METHOD_CHECK],
      FIELD(readOnly)[ConfigKey.REQUEST_HEADERS_CHECK],
      FIELD(readOnly)[ConfigKey.REQUEST_BODY_CHECK],
      FIELD(readOnly)[ConfigKey.PROXY_URL],
      FIELD(readOnly)[ConfigKey.PROXY_HEADERS],
      FIELD(readOnly)[ConfigKey.MODE],
      FIELD(readOnly)[ConfigKey.IPV4],
    ],
  },
  responseConfig: {
    title: i18n.translate('xpack.synthetics.monitorConfig.section.responseConfiguration.title', {
      defaultMessage: 'Response configuration',
    }),
    description: i18n.translate(
      'xpack.synthetics.monitorConfig.section.responseConfiguration.description',
      {
        defaultMessage: 'Control the indexing of the HTTP response contents.',
      }
    ),
    components: [
      FIELD(readOnly)[ConfigKey.RESPONSE_HEADERS_INDEX],
      FIELD(readOnly)[ConfigKey.RESPONSE_BODY_INDEX],
      FIELD(readOnly)[ConfigKey.RESPONSE_BODY_MAX_BYTES],
    ],
  },
  responseChecks: {
    title: i18n.translate('xpack.synthetics.monitorConfig.section.responseChecks.title', {
      defaultMessage: 'Response checks',
    }),
    description: i18n.translate(
      'xpack.synthetics.monitorConfig.section.responseChecks.description',
      {
        defaultMessage: 'Configure the expected HTTP response.',
      }
    ),
    components: [
      FIELD(readOnly)[ConfigKey.RESPONSE_STATUS_CHECK],
      FIELD(readOnly)[ConfigKey.RESPONSE_HEADERS_CHECK],
      FIELD(readOnly)[ConfigKey.RESPONSE_BODY_CHECK_POSITIVE],
      FIELD(readOnly)[ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE],
      FIELD(readOnly)[ConfigKey.RESPONSE_JSON_CHECK],
    ],
  },
});

export const TCP_ADVANCED = (readOnly: boolean) => ({
  requestConfig: {
    title: i18n.translate('xpack.synthetics.monitorConfig.section.requestConfigTCP.title', {
      defaultMessage: 'Request configuration',
    }),
    description: i18n.translate(
      'xpack.synthetics.monitorConfig.section.requestConfigTCP.description',
      {
        defaultMessage: 'Configure the payload sent to the remote host.',
      }
    ),
    components: [
      FIELD(readOnly)[`${ConfigKey.PROXY_URL}__tcp`],
      FIELD(readOnly)[ConfigKey.REQUEST_SEND_CHECK],
      FIELD(readOnly)[ConfigKey.MODE],
      FIELD(readOnly)[ConfigKey.IPV4],
    ],
  },
  responseChecks: {
    title: i18n.translate('xpack.synthetics.monitorConfig.section.responseChecksTCP.title', {
      defaultMessage: 'Response checks',
    }),
    description: i18n.translate(
      'xpack.synthetics.monitorConfig.section.responseChecksTCP.description',
      {
        defaultMessage: 'Configure the expected response from the remote host.',
      }
    ),
    components: [FIELD(readOnly)[ConfigKey.RESPONSE_RECEIVE_CHECK]],
  },
});

export const ICMP_ADVANCED = (readOnly: boolean) => ({
  requestConfig: {
    title: i18n.translate('xpack.synthetics.monitorConfig.section.requestConfigICMP.title', {
      defaultMessage: 'Request configuration',
    }),
    description: i18n.translate(
      'xpack.synthetics.monitorConfig.section.requestConfigICMP.description',
      {
        defaultMessage: 'Configure the payload sent to the remote host.',
      }
    ),
    components: [FIELD(readOnly)[ConfigKey.MODE], FIELD(readOnly)[ConfigKey.IPV4]],
  },
});

export const BROWSER_ADVANCED = (readOnly: boolean) => [
  {
    title: i18n.translate('xpack.synthetics.monitorConfig.section.syntAgentOptions.title', {
      defaultMessage: 'Synthetics agent options',
    }),
    description: i18n.translate(
      'xpack.synthetics.monitorConfig.section.syntAgentOptions.description',
      {
        defaultMessage: 'Provide fine-tuned configuration for the synthetics agent.',
      }
    ),
    components: [
      FIELD(readOnly)[ConfigKey.THROTTLING_CONFIG],
      FIELD(readOnly)[ConfigKey.IGNORE_HTTPS_ERRORS],
      FIELD(readOnly)[ConfigKey.SYNTHETICS_ARGS],
      FIELD(readOnly)[ConfigKey.PLAYWRIGHT_OPTIONS],
    ],
  },
];

interface AdvancedFieldGroup {
  title: string;
  description: string;
  components: Array<FieldMeta<any>>;
}

type FieldConfig = Record<
  FormMonitorType,
  {
    step1: Array<FieldMeta<any>>;
    step2: Array<FieldMeta<any>>;
    step3?: Array<FieldMeta<any>>;
    scriptEdit?: Array<FieldMeta<any>>;
    advanced?: AdvancedFieldGroup[];
  }
>;

const TLS_OPTIONS = (readOnly: boolean): AdvancedFieldGroup => ({
  title: i18n.translate('xpack.synthetics.monitorConfig.section.tlsOptions.title', {
    defaultMessage: 'TLS options',
  }),
  description: i18n.translate('xpack.synthetics.monitorConfig.section.tlsOptions.description', {
    defaultMessage:
      'Configure TLS options, including verification mode, certificate authorities, and client certificates.',
  }),
  components: [
    FIELD(readOnly).isTLSEnabled,
    FIELD(readOnly)[ConfigKey.TLS_VERIFICATION_MODE],
    FIELD(readOnly)[ConfigKey.TLS_VERSION],
    FIELD(readOnly)[ConfigKey.TLS_CERTIFICATE_AUTHORITIES],
    FIELD(readOnly)[ConfigKey.TLS_CERTIFICATE],
    FIELD(readOnly)[ConfigKey.TLS_KEY],
    FIELD(readOnly)[ConfigKey.TLS_KEY_PASSPHRASE],
  ],
});

export const FORM_CONFIG = (readOnly: boolean): FieldConfig => ({
  [FormMonitorType.HTTP]: {
    step1: [FIELD(readOnly)[ConfigKey.FORM_MONITOR_TYPE]],
    step2: [
      FIELD(readOnly)[`${ConfigKey.URLS}__http`],
      FIELD(readOnly)[ConfigKey.NAME],
      FIELD(readOnly)[ConfigKey.LOCATIONS],
      FIELD(readOnly)[`${ConfigKey.SCHEDULE}.number`],
      FIELD(readOnly)[ConfigKey.MAX_REDIRECTS],
      FIELD(readOnly)[ConfigKey.TIMEOUT],
      FIELD(readOnly)[ConfigKey.ENABLED],
      FIELD(readOnly)[ConfigKey.MAX_ATTEMPTS],
      FIELD(readOnly)[AlertConfigKey.STATUS_ENABLED],
      FIELD(readOnly)[AlertConfigKey.TLS_ENABLED],
    ],
    advanced: [
      DEFAULT_DATA_OPTIONS(readOnly),
      HTTP_ADVANCED(readOnly).requestConfig,
      HTTP_ADVANCED(readOnly).responseConfig,
      HTTP_ADVANCED(readOnly).responseChecks,
      TLS_OPTIONS(readOnly),
    ],
  },
  [FormMonitorType.TCP]: {
    step1: [FIELD(readOnly)[ConfigKey.FORM_MONITOR_TYPE]],
    step2: [
      FIELD(readOnly)[`${ConfigKey.HOSTS}__tcp`],
      FIELD(readOnly)[ConfigKey.NAME],
      FIELD(readOnly)[ConfigKey.LOCATIONS],
      FIELD(readOnly)[`${ConfigKey.SCHEDULE}.number`],
      FIELD(readOnly)[ConfigKey.TIMEOUT],
      FIELD(readOnly)[ConfigKey.ENABLED],
      FIELD(readOnly)[ConfigKey.MAX_ATTEMPTS],
      FIELD(readOnly)[AlertConfigKey.STATUS_ENABLED],
      FIELD(readOnly)[AlertConfigKey.TLS_ENABLED],
    ],
    advanced: [
      DEFAULT_DATA_OPTIONS(readOnly),
      TCP_ADVANCED(readOnly).requestConfig,
      TCP_ADVANCED(readOnly).responseChecks,
      TLS_OPTIONS(readOnly),
    ],
  },
  [FormMonitorType.MULTISTEP]: {
    step1: [FIELD(readOnly)[ConfigKey.FORM_MONITOR_TYPE]],
    step2: [
      FIELD(readOnly)[ConfigKey.NAME],
      FIELD(readOnly)[ConfigKey.LOCATIONS],
      FIELD(readOnly)[`${ConfigKey.SCHEDULE}.number`],
      FIELD(readOnly)[ConfigKey.ENABLED],
      FIELD(readOnly)[ConfigKey.MAX_ATTEMPTS],
      FIELD(readOnly)[AlertConfigKey.STATUS_ENABLED],
    ],
    step3: [FIELD(readOnly)['source.inline'], FIELD(readOnly)[ConfigKey.PARAMS]],
    scriptEdit: [FIELD(readOnly)['source.inline'], FIELD(readOnly)[ConfigKey.PARAMS]],
    advanced: [
      {
        ...DEFAULT_DATA_OPTIONS(readOnly),
        components: [
          FIELD(readOnly)[ConfigKey.TAGS],
          FIELD(readOnly)[ConfigKey.APM_SERVICE_NAME],
          FIELD(readOnly)[ConfigKey.SCREENSHOTS],
          FIELD(readOnly)[ConfigKey.NAMESPACE],
        ],
      },
      ...BROWSER_ADVANCED(readOnly),
    ],
  },
  [FormMonitorType.SINGLE]: {
    step1: [FIELD(readOnly)[ConfigKey.FORM_MONITOR_TYPE]],
    step2: [
      FIELD(readOnly)[`${ConfigKey.URLS}__single`],
      FIELD(readOnly)[ConfigKey.NAME],
      FIELD(readOnly)[ConfigKey.TEXT_ASSERTION],
      FIELD(readOnly)[ConfigKey.LOCATIONS],
      FIELD(readOnly)[`${ConfigKey.SCHEDULE}.number`],
      FIELD(readOnly)[ConfigKey.ENABLED],
      FIELD(readOnly)[ConfigKey.MAX_ATTEMPTS],
      FIELD(readOnly)[AlertConfigKey.STATUS_ENABLED],
    ],
    advanced: [
      {
        ...DEFAULT_DATA_OPTIONS(readOnly),
        components: [
          FIELD(readOnly)[ConfigKey.TAGS],
          FIELD(readOnly)[ConfigKey.APM_SERVICE_NAME],
          FIELD(readOnly)[ConfigKey.SCREENSHOTS],
          FIELD(readOnly)[ConfigKey.NAMESPACE],
        ],
      },
      ...BROWSER_ADVANCED(readOnly),
    ],
  },
  [FormMonitorType.ICMP]: {
    step1: [FIELD(readOnly)[ConfigKey.FORM_MONITOR_TYPE]],
    step2: [
      FIELD(readOnly)[`${ConfigKey.HOSTS}__icmp`],
      FIELD(readOnly)[ConfigKey.NAME],
      FIELD(readOnly)[ConfigKey.LOCATIONS],
      FIELD(readOnly)[`${ConfigKey.SCHEDULE}.number`],
      FIELD(readOnly)[ConfigKey.WAIT],
      FIELD(readOnly)[ConfigKey.TIMEOUT],
      FIELD(readOnly)[ConfigKey.ENABLED],
      FIELD(readOnly)[ConfigKey.MAX_ATTEMPTS],
      FIELD(readOnly)[AlertConfigKey.STATUS_ENABLED],
    ],
    advanced: [DEFAULT_DATA_OPTIONS(readOnly), ICMP_ADVANCED(readOnly).requestConfig],
  },
});
