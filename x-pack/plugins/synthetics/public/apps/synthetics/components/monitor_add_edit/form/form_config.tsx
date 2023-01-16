/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ConfigKey, FormMonitorType, FieldMeta } from '../types';

import { FIELD } from './field_config';

const DEFAULT_DATA_OPTIONS = {
  title: i18n.translate('xpack.synthetics.monitorConfig.section.dataOptions.title', {
    defaultMessage: 'Data options',
  }),
  description: i18n.translate('xpack.synthetics.monitorConfig.section.dataOptions.description', {
    defaultMessage: 'Configure data options to add context to the data coming from your monitors.',
  }),
  components: [
    FIELD[ConfigKey.TAGS],
    FIELD[ConfigKey.APM_SERVICE_NAME],
    FIELD[ConfigKey.NAMESPACE],
  ],
};

const HTTP_ADVANCED = {
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
      FIELD[ConfigKey.USERNAME],
      FIELD[ConfigKey.PASSWORD],
      FIELD[ConfigKey.PROXY_URL],
      FIELD[ConfigKey.REQUEST_METHOD_CHECK],
      FIELD[ConfigKey.REQUEST_HEADERS_CHECK],
      FIELD[ConfigKey.REQUEST_BODY_CHECK],
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
    components: [FIELD[ConfigKey.RESPONSE_HEADERS_INDEX], FIELD[ConfigKey.RESPONSE_BODY_INDEX]],
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
      FIELD[ConfigKey.RESPONSE_STATUS_CHECK],
      FIELD[ConfigKey.RESPONSE_HEADERS_CHECK],
      FIELD[ConfigKey.RESPONSE_BODY_CHECK_POSITIVE],
      FIELD[ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE],
    ],
  },
};

export const TCP_ADVANCED = {
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
    components: [FIELD[`${ConfigKey.PROXY_URL}__tcp`], FIELD[ConfigKey.REQUEST_SEND_CHECK]],
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
    components: [FIELD[ConfigKey.RESPONSE_RECEIVE_CHECK]],
  },
};

export const BROWSER_ADVANCED = [
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
      FIELD[ConfigKey.IGNORE_HTTPS_ERRORS],
      FIELD[ConfigKey.SYNTHETICS_ARGS],
      FIELD[ConfigKey.PLAYWRIGHT_OPTIONS],
    ],
  },
];

interface AdvancedFieldGroup {
  title: string;
  description: string;
  components: FieldMeta[];
}

type FieldConfig = Record<
  FormMonitorType,
  {
    step1: FieldMeta[];
    step2: FieldMeta[];
    step3?: FieldMeta[];
    scriptEdit?: FieldMeta[];
    advanced?: AdvancedFieldGroup[];
  }
>;

const TLS_OPTIONS = {
  title: i18n.translate('xpack.synthetics.monitorConfig.section.tlsOptions.title', {
    defaultMessage: 'TLS options',
  }),
  description: i18n.translate('xpack.synthetics.monitorConfig.section.tlsOptions.description', {
    defaultMessage:
      'Configure TLS options, including verification mode, certificate authorities, and client certificates.',
  }),
  components: [
    FIELD.isTLSEnabled,
    FIELD[ConfigKey.TLS_VERIFICATION_MODE],
    FIELD[ConfigKey.TLS_VERSION],
    FIELD[ConfigKey.TLS_CERTIFICATE_AUTHORITIES],
    FIELD[ConfigKey.TLS_CERTIFICATE],
    FIELD[ConfigKey.TLS_KEY],
    FIELD[ConfigKey.TLS_KEY_PASSPHRASE],
  ],
};

export const FORM_CONFIG: FieldConfig = {
  [FormMonitorType.HTTP]: {
    step1: [FIELD[ConfigKey.FORM_MONITOR_TYPE]],
    step2: [
      FIELD[`${ConfigKey.URLS}__http`],
      FIELD[ConfigKey.NAME],
      FIELD[ConfigKey.LOCATIONS],
      FIELD[ConfigKey.SCHEDULE],
      FIELD[ConfigKey.MAX_REDIRECTS],
      FIELD[ConfigKey.TIMEOUT],
      FIELD[ConfigKey.ENABLED],
      FIELD[ConfigKey.ALERT_CONFIG],
    ],
    advanced: [
      DEFAULT_DATA_OPTIONS,
      HTTP_ADVANCED.requestConfig,
      HTTP_ADVANCED.responseConfig,
      HTTP_ADVANCED.responseChecks,
      TLS_OPTIONS,
    ],
  },
  [FormMonitorType.TCP]: {
    step1: [FIELD[ConfigKey.FORM_MONITOR_TYPE]],
    step2: [
      FIELD[`${ConfigKey.HOSTS}__tcp`],
      FIELD[ConfigKey.NAME],
      FIELD[ConfigKey.LOCATIONS],
      FIELD[ConfigKey.SCHEDULE],
      FIELD[ConfigKey.TIMEOUT],
      FIELD[ConfigKey.ENABLED],
      FIELD[ConfigKey.ALERT_CONFIG],
    ],
    advanced: [
      DEFAULT_DATA_OPTIONS,
      TCP_ADVANCED.requestConfig,
      TCP_ADVANCED.responseChecks,
      TLS_OPTIONS,
    ],
  },
  [FormMonitorType.MULTISTEP]: {
    step1: [FIELD[ConfigKey.FORM_MONITOR_TYPE]],
    step2: [
      FIELD[ConfigKey.NAME],
      FIELD[ConfigKey.LOCATIONS],
      FIELD[ConfigKey.SCHEDULE],
      FIELD[ConfigKey.THROTTLING_CONFIG],
      FIELD[ConfigKey.ENABLED],
      FIELD[ConfigKey.ALERT_CONFIG],
    ],
    step3: [FIELD[ConfigKey.SOURCE_INLINE], FIELD[ConfigKey.PARAMS]],
    scriptEdit: [FIELD[ConfigKey.SOURCE_INLINE]],
    advanced: [
      {
        ...DEFAULT_DATA_OPTIONS,
        components: [
          FIELD[ConfigKey.TAGS],
          FIELD[ConfigKey.APM_SERVICE_NAME],
          FIELD[ConfigKey.SCREENSHOTS],
          FIELD[ConfigKey.NAMESPACE],
        ],
      },
      ...BROWSER_ADVANCED,
    ],
  },
  [FormMonitorType.SINGLE]: {
    step1: [FIELD[ConfigKey.FORM_MONITOR_TYPE]],
    step2: [
      FIELD[`${ConfigKey.URLS}__single`],
      FIELD[ConfigKey.NAME],
      FIELD[ConfigKey.TEXT_ASSERTION],
      FIELD[ConfigKey.LOCATIONS],
      FIELD[ConfigKey.SCHEDULE],
      FIELD[ConfigKey.THROTTLING_CONFIG],
      FIELD[ConfigKey.ENABLED],
      FIELD[ConfigKey.ALERT_CONFIG],
    ],
    advanced: [
      {
        ...DEFAULT_DATA_OPTIONS,
        components: [
          FIELD[ConfigKey.TAGS],
          FIELD[ConfigKey.APM_SERVICE_NAME],
          FIELD[ConfigKey.SCREENSHOTS],
          FIELD[ConfigKey.NAMESPACE],
        ],
      },
      ...BROWSER_ADVANCED,
    ],
  },
  [FormMonitorType.ICMP]: {
    step1: [FIELD[ConfigKey.FORM_MONITOR_TYPE]],
    step2: [
      FIELD[`${ConfigKey.HOSTS}__icmp`],
      FIELD[ConfigKey.NAME],
      FIELD[ConfigKey.LOCATIONS],
      FIELD[ConfigKey.SCHEDULE],
      FIELD[ConfigKey.WAIT],
      FIELD[ConfigKey.TIMEOUT],
      FIELD[ConfigKey.ENABLED],
    ],
    advanced: [DEFAULT_DATA_OPTIONS],
  },
};
