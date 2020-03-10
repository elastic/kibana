/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { transactionSampleRateRt } from './transaction_sample_rate_rt';
import { transactionMaxSpansRt } from './transaction_max_spans_rt';
import { captureBodyRt } from './capture_body_rt';
import { booleanRt } from './boolean_rt';
import { BYTE_UNITS, bytesRt } from './bytes_rt';
import { DURATION_UNITS, durationRt } from './duration_rt';

interface BaseSetting {
  key: string;
  label: string;
  defaultValue?: string;
  helpText: string;
  placeholder?: string;
  validation: t.Type<any, any, unknown>;
  validationError?: string;
}

interface TextSetting extends BaseSetting {
  type: 'text';
}

interface NumberSetting extends BaseSetting {
  type: 'number';
  min: number;
  max: number;
}

interface SelectSetting extends BaseSetting {
  type: 'select';
  options: Array<{ text: string }>;
}

interface BooleanSetting extends BaseSetting {
  type: 'boolean';
}

interface AmountAndUnit extends BaseSetting {
  type: 'amountAndUnit';
  units: string[];
}

export type SettingDefinition =
  | TextSetting
  | NumberSetting
  | SelectSetting
  | BooleanSetting
  | AmountAndUnit;

/*
 * Settings added here will automatically be added to  `agent_configuration/agent_configuration_intake_rt.ts`
 * and validated bothj client and server-side
 */
export const settingDefinitions: SettingDefinition[] = [
  // Active
  {
    key: 'active',
    validation: booleanRt,
    type: 'boolean',
    defaultValue: 'off',
    label: i18n.translate('apm.agentConfig.active.label', {
      defaultMessage: 'Active'
    }),
    helpText: i18n.translate('apm.agentConfig.active.helpText', {
      defaultMessage: 'abc'
    })
  },

  // API Request Size
  {
    key: 'api_request_size',
    type: 'amountAndUnit',
    validation: bytesRt,
    validationError: i18n.translate(
      'apm.agentConfig.apiRequestSize.errorText',
      { defaultMessage: 'Please specify a value and a unit' }
    ),
    units: BYTE_UNITS,
    defaultValue: '768kb',
    label: i18n.translate('apm.agentConfig.apiRequestSize.label', {
      defaultMessage: 'API Request Size'
    }),
    helpText: i18n.translate('apm.agentConfig.apiRequestSize.helpText', {
      defaultMessage: 'abc'
    })
  },

  // API Request Time
  {
    key: 'api_request_time',
    type: 'amountAndUnit',
    validation: durationRt,
    validationError: i18n.translate(
      'apm.agentConfig.apiRequestTime.errorText',
      { defaultMessage: 'Please specify a value and a unit' }
    ),
    units: DURATION_UNITS,
    defaultValue: '10s',
    label: i18n.translate('apm.agentConfig.apiRequestTime.label', {
      defaultMessage: 'API Request Time'
    }),
    helpText: i18n.translate('apm.agentConfig.apiRequestTime.helpText', {
      defaultMessage: 'abc'
    })
  },

  // Capture headers
  {
    key: 'capture_headers',
    type: 'boolean',
    validation: booleanRt,
    defaultValue: 'true',
    label: i18n.translate('apm.agentConfig.captureHeaders.label', {
      defaultMessage: 'Capture Headers'
    }),
    helpText: i18n.translate('apm.agentConfig.captureHeaders.helpText', {
      defaultMessage: 'abc'
    })
  },

  // ENABLE_LOG_CORRELATION
  {
    key: 'enable_log_correlation',
    type: 'boolean',
    validation: booleanRt,
    defaultValue: 'false',
    label: i18n.translate('apm.agentConfig.enableLogCorrelation.label', {
      defaultMessage: 'Enable log correlation'
    }),
    helpText: i18n.translate('apm.agentConfig.enableLogCorrelation.helpText', {
      defaultMessage: 'abc'
    })
  },

  // LOG_LEVEL
  {
    key: 'log_level',
    type: 'text',
    validation: t.string,
    validationError: '',
    defaultValue: 'info',
    label: i18n.translate('apm.agentConfig.logLevel.label', {
      defaultMessage: 'Log level'
    }),
    helpText: i18n.translate('apm.agentConfig.logLevel.helpText', {
      defaultMessage: 'abc'
    })
  },

  // SERVER_TIMEOUT
  {
    key: 'server_timeout',
    type: 'amountAndUnit',
    validation: durationRt,
    validationError: i18n.translate('apm.agentConfig.serverTimeout.errorText', {
      defaultMessage: 'Please specify a value and a unit'
    }),
    units: DURATION_UNITS,
    label: i18n.translate('apm.agentConfig.serverTimeout.label', {
      defaultMessage: 'Server Timeout'
    }),
    helpText: i18n.translate('apm.agentConfig.serverTimeout.helpText', {
      defaultMessage: 'abc'
    })
  },

  // SPAN_FRAMES_MIN_DURATION
  {
    key: 'span_frames_min_duration',
    type: 'amountAndUnit',
    validation: durationRt,
    validationError: i18n.translate('apm.agentConfig.serverTimeout.errorText', {
      defaultMessage: 'Please specify a value and a unit'
    }),
    units: DURATION_UNITS,
    label: i18n.translate('apm.agentConfig.serverTimeout.label', {
      defaultMessage: 'Span frames minimum duration'
    }),
    helpText: i18n.translate('apm.agentConfig.serverTimeout.helpText', {
      defaultMessage: 'abc'
    })
  },

  /*
   *
   *
   *
   *
   *
   *
   *
   * ** ** ** ** ** ** ** ** ** ** ** ** */

  // Transaction sample rate
  {
    key: 'transaction_sample_rate',
    type: 'text',
    validation: transactionSampleRateRt,
    validationError: i18n.translate(
      'apm.agentConfig.transactionSampleRate.errorText',
      { defaultMessage: 'Sample rate must be between 0.000 and 1' }
    ),
    defaultValue: '1.0',
    label: i18n.translate('apm.agentConfig.transactionSampleRate.label', {
      defaultMessage: 'Transaction sample rate'
    }),
    helpText: i18n.translate('apm.agentConfig.transactionSampleRate.helpText', {
      defaultMessage:
        'Choose a rate between 0.000 and 1.0. Default is 1.0 (100% of traces).'
    })
  },

  // Capture body
  {
    key: 'capture_body',
    validation: captureBodyRt,
    type: 'select',
    defaultValue: 'off',
    label: i18n.translate('apm.agentConfig.captureBody.label', {
      defaultMessage: 'Capture body'
    }),
    helpText: i18n.translate('apm.agentConfig.captureBody.helpText', {
      defaultMessage:
        'For transactions that are HTTP requests, the agent can optionally capture the request body (e.g. POST variables). Default is "off".'
    }),
    options: [
      { text: 'off' },
      { text: 'errors' },
      { text: 'transactions' },
      { text: 'all' }
    ]
  },

  // Transaction max spans
  {
    key: 'transaction_max_spans',
    type: 'number',
    validation: transactionMaxSpansRt,
    validationError: i18n.translate(
      'apm.agentConfig.transactionMaxSpans.errorText',
      { defaultMessage: 'Must be between 0 and 32000' }
    ),
    defaultValue: '500',
    label: i18n.translate('apm.agentConfig.transactionMaxSpans.label', {
      defaultMessage: 'Transaction max spans'
    }),
    helpText: i18n.translate('apm.agentConfig.transactionMaxSpans.helpText', {
      defaultMessage:
        'Limits the amount of spans that are recorded per transaction. Default is 500.'
    }),
    min: 0,
    max: 32000
  }
];

export function isValid(setting: SettingDefinition, value: unknown) {
  return isRight(setting.validation.decode(value));
}
